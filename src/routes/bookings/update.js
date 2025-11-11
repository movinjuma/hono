import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * PUT /bookings/:id
 * Allows landlord to update booking status or extend stay.
 * Only the landlord of the booking can perform this update.
 */
export const updateBooking = async (c) => {
  const timestamp = new Date().toISOString();
  const bookingId = c.req.param('id');
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const actor = token ? await checkToken(token) : null;

  if (!actor) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid token.',
        timestamp,
      },
      401
    );
  }

  let updateData;
  try {
    updateData = await c.req.json();
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Request body must be valid JSON.');
    }
  } catch (err) {
    console.error('❌ Body parse error:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'INVALID_BODY',
        message: 'Request body must be valid JSON.',
        timestamp,
      },
      400
    );
  }

  if (!bookingId || typeof bookingId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_BOOKING_ID',
        message: 'Booking ID is required and must be a string.',
        timestamp,
      },
      400
    );
  }

  let bookingsCollection;
  try {
    bookingsCollection = await getCollection('bookings');
    if (!bookingsCollection?.find || !bookingsCollection?.patch) {
      throw new Error('Collection "bookings" missing required methods.');
    }
    console.log('📦 Connected to collection: bookings');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed.',
        timestamp,
      },
      503
    );
  }

  let booking;
  try {
    const result = await bookingsCollection.find({ booking_id: { $eq: bookingId } });
    const matches = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
    booking = matches[0] || null;

    if (!booking) {
      return c.json(
        {
          success: false,
          error: 'BOOKING_NOT_FOUND',
          message: `No booking found with ID "${bookingId}".`,
          timestamp,
        },
        404
      );
    }
  } catch (queryErr) {
    console.error('❌ Booking lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve booking.',
        timestamp,
      },
      500
    );
  }

  // 🧠 Authorization: only landlord can update
  if (booking.landlord_id !== actor.userId) {
    return c.json(
      {
        success: false,
        error: 'FORBIDDEN',
        message: 'Only the landlord of this booking can update it.',
        timestamp,
      },
      403
    );
  }

  // 🛠️ Supported updates
  const allowedFields = ['status', 'new_checkout_date', 'notes'];
  const updatePayload = {};

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updateData, key)) {
      updatePayload[key] = updateData[key];
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return c.json(
      {
        success: false,
        error: 'NO_VALID_FIELDS',
        message: 'No valid fields provided for update.',
        timestamp,
      },
      400
    );
  }

  // 🧾 Audit metadata
  updatePayload.updated_by = actor.userId;
  updatePayload.updated_at = timestamp;
  updatePayload.audit_ip = c.req.header('x-forwarded-for') || '';
  updatePayload.audit_useragent = c.req.header('user-agent') || '';
  updatePayload.audit_traceid = c.req.header('x-trace-id') || '';

  try {
    await bookingsCollection.patch(booking._id, updatePayload);
    return c.json({
      success: true,
      message: 'Booking updated successfully.',
      updatedFields: Object.keys(updatePayload),
      timestamp,
    });
  } catch (updateErr) {
    console.error('❌ Booking update failed:', updateErr.message || updateErr);
    if (updateErr.response?.data) {
      console.error('📄 Astra update error:', JSON.stringify(updateErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update booking.',
        timestamp,
      },
      500
    );
  }
};
