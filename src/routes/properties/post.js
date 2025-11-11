import { getCollection } from '../../services/astra.js';
import { checkToken, roleCheck } from '../../utils/auth.js';
import { verifyPayment } from '../../services/paystack.js';
import { uuid } from 'uuidv4';

export async function postProperty(c) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const payload = await checkToken(token);

    if (!payload) {
      return c.json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing token.',
        timestamp,
      }, 401);
    }

    const allowedRoles = ['landlord', 'admin', 'ceo', 'dual'];
    if (!roleCheck(payload, allowedRoles)) {
      return c.json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Insufficient role to create property.',
        timestamp,
      }, 403);
    }

    const body = await c.req.json();
    const { title, description, price, location, rooms, payment_reference } = body;

    if (!title || !description || !price || !location || !payment_reference) {
      return c.json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Required fields including payment_reference are missing.',
        timestamp,
      }, 400);
    }

    if (rooms && !Array.isArray(rooms)) {
      return c.json({
        success: false,
        error: 'INVALID_ROOMS',
        message: 'Rooms must be an array.',
        timestamp,
      }, 400);
    }

    const isCEO = payload.role === 'ceo';

    let propertiesCol, roomsCol, paymentsCol;
    try {
      [propertiesCol, roomsCol, paymentsCol] = await Promise.all([
        getCollection('properties'),
        getCollection('rooms'),
        getCollection('payments'),
      ]);
    } catch (err) {
      console.error('❌ DB connection error:', err.message || err);
      return c.json({
        success: false,
        error: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed.',
        timestamp,
      }, 503);
    }

    let paymentData = null;

    if (!isCEO) {
      let existingPayment;
      try {
        const result = await paymentsCol.find({ reference: payment_reference });
        existingPayment = Object.values(result?.data || {})[0];
      } catch (lookupErr) {
        console.error('❌ Payment lookup failed:', lookupErr.message || lookupErr);
      }

      if (existingPayment?.status === 'used') {
        return c.json({
          success: false,
          error: 'PAYMENT_ALREADY_USED',
          message: 'Payment reference has already been used.',
          timestamp,
        }, 409);
      }

      const verified = await verifyPayment(payment_reference);
      paymentData = verified?.data;

      if (!paymentData || paymentData.status !== 'success') {
        return c.json({
          success: false,
          error: 'PAYMENT_VERIFICATION_FAILED',
          message: 'Payment verification failed.',
          timestamp,
        }, 402);
      }
    }

    const propertyId = uuid();
    const newProperty = {
      id: propertyId,
      title,
      description,
      price,
      location,
      landlordId: payload.userId,
      createdAt: timestamp,
      status: 'available',
    };

    try {
      await propertiesCol.post(newProperty);
    } catch (insertErr) {
      console.error('❌ Property insert failed:', insertErr.message || insertErr);
      return c.json({
        success: false,
        error: 'PROPERTY_INSERT_FAILED',
        message: 'Failed to create property.',
        timestamp,
      }, 500);
    }

    let roomsCreated = 0;
    try {
      const roomInsertions = (rooms || []).map((room, index) => {
        const { name, size, ensuite, amenities } = room;
        if (!name || !size) {
          throw new Error(`Room ${index + 1} missing required fields (name, size).`);
        }

        const roomId = uuid(); // ✅ generate unique room_id

        return roomsCol.post({
          room_id: roomId, // ✅ assign explicitly
          propertyId,
          name,
          size,
          ensuite: Boolean(ensuite),
          amenities: Array.isArray(amenities) ? amenities : [],
          createdAt: timestamp,
        });
      });

      const results = await Promise.all(roomInsertions);
      roomsCreated = results.length;
    } catch (roomErr) {
      console.error('❌ Room creation failed:', roomErr.message || roomErr);
      return c.json({
        success: false,
        error: 'ROOM_INSERT_FAILED',
        message: roomErr.message || 'Failed to create rooms.',
        timestamp,
      }, 500);
    }

    if (!isCEO && paymentData) {
      try {
        await paymentsCol.post({
          reference: payment_reference,
          status: 'used',
          verified_at: timestamp,
          amount: paymentData.amount,
          currency: paymentData.currency,
          email: paymentData.customer?.email,
          metadata: paymentData.metadata || {},
          linked_property_id: propertyId,
        });
      } catch (paymentErr) {
        console.warn('⚠️ Failed to record payment usage:', paymentErr.message || paymentErr);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Property created in ${duration}ms`);

    return c.json({
      success: true,
      message: 'Property and rooms created successfully.',
      propertyId,
      roomsCreated,
      timestamp,
      durationMs: duration,
    }, 201);
  } catch (err) {
    console.error('🔥 Unexpected error during property creation:', err.message || err);
    return c.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: err.message || 'Failed to create property.',
      timestamp: new Date().toISOString(),
    }, 500);
  }
}
