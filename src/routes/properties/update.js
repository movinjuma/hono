import { getCollection } from '../../services/astra.js';
import { checkToken, roleCheck } from '../../utils/auth.js';
import { uuid } from 'uuidv4';

/**
 * PUT /properties/:id
 * Updates a property and optionally adds rooms.
 */
export const updateProperty = async (c) => {
  const timestamp = new Date().toISOString();
  const propertyId = c.req.param('id');
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const payload = await checkToken(token);

  if (!payload) {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid token.',
      timestamp,
    }, 401);
  }

  const elevatedRoles = ['ceo', 'admin', 'customercare'];

  let body;
  try {
    body = await c.req.json();
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be valid JSON.');
    }
  } catch (err) {
    console.error('❌ Body parse error:', err.message || err);
    return c.json({
      success: false,
      error: 'INVALID_BODY',
      message: 'Request body must be valid JSON.',
      timestamp,
    }, 400);
  }

  let propertiesCollection, roomsCollection;
  try {
    [propertiesCollection, roomsCollection] = await Promise.all([
      getCollection('properties'),
      getCollection('rooms'),
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

  let property, docId;
  try {
    const result = await propertiesCollection.find({ id: { $eq: propertyId } });
    const entries = Object.entries(result?.data || {});
    if (entries.length === 0) {
      return c.json({
        success: false,
        error: 'PROPERTY_NOT_FOUND',
        message: `No property found with ID "${propertyId}".`,
        timestamp,
      }, 404);
    }
    [docId, property] = entries[0];
  } catch (queryErr) {
    console.error('❌ Property lookup failed:', queryErr.message || queryErr);
    return c.json({
      success: false,
      error: 'DB_QUERY_FAILED',
      message: 'Failed to retrieve property.',
      timestamp,
    }, 500);
  }

  const isOwner = property.landlordId === payload.userId;
  const isElevated = roleCheck(payload, elevatedRoles);

  if (!isOwner && !isElevated) {
    return c.json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the property owner or elevated roles can update this property.',
      timestamp,
    }, 403);
  }

  const { rooms, ...propertyUpdates } = body;

  try {
    await propertiesCollection.patch(docId, {
      ...propertyUpdates,
      updatedAt: timestamp,
    });
  } catch (updateErr) {
    console.error('❌ Property update failed:', updateErr.message || updateErr);
    return c.json({
      success: false,
      error: 'UPDATE_FAILED',
      message: 'Failed to update property.',
      timestamp,
    }, 500);
  }

  let roomsAdded = 0;
  if (Array.isArray(rooms)) {
    try {
      const roomInsertions = rooms.map((room, index) => {
        const { name, size, ensuite, amenities } = room;
        if (!name || !size) {
          throw new Error(`Room ${index + 1} missing required fields (name, size).`);
        }

        const roomId = uuid(); // ✅ generate unique room_id

        return roomsCollection.post({
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
      roomsAdded = results.length;
    } catch (roomErr) {
      console.error('❌ Room creation failed:', roomErr.message || roomErr);
      return c.json({
        success: false,
        error: 'ROOM_INSERT_FAILED',
        message: roomErr.message || 'Failed to add rooms.',
        timestamp,
      }, 500);
    }
  }

  return c.json({
    success: true,
    message: 'Property updated successfully.',
    propertyId,
    roomsAdded,
    timestamp,
  });
};
