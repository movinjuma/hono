import { getCollection } from '../../services/astra.js';

/**
 * GET /rooms/:id
 * Fetches a single room by its ID.
 * Optional query param: ?withProperty=true to include parent property.
 */
export const getRoomById = async (c) => {
  const timestamp = new Date().toISOString();
  const roomId = c.req.param('id');
  const withProperty = c.req.query('withProperty') === 'true';

  if (!roomId || typeof roomId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_ROOM_ID',
        message: 'Room ID is required and must be a string.',
        timestamp,
      },
      400
    );
  }

  let roomsCollection, propertiesCollection;
  try {
    roomsCollection = await getCollection('rooms');
    if (!roomsCollection?.find || typeof roomsCollection.find !== 'function') {
      throw new Error('Collection "rooms" missing .find() method.');
    }

    if (withProperty) {
      propertiesCollection = await getCollection('properties');
      if (!propertiesCollection?.find || typeof propertiesCollection.find !== 'function') {
        throw new Error('Collection "properties" missing .find() method.');
      }
    }

    console.log('📦 Connected to collection: rooms', withProperty ? 'and properties' : '');
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

  let room;
  try {
    const result = await roomsCollection.find({ room_id: roomId });
    room = Object.values(result?.data || {})[0];
    if (!room) {
      return c.json(
        {
          success: false,
          error: 'ROOM_NOT_FOUND',
          message: `No room found with ID "${roomId}".`,
          timestamp,
        },
        404
      );
    }
  } catch (queryErr) {
    console.error('❌ Room lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve room.',
        timestamp,
      },
      500
    );
  }

  if (withProperty && room.propertyId) {
    try {
      const propResult = await propertiesCollection.find({ property_id: room.propertyId });
      const property = Object.values(propResult?.data || {})[0];
      if (property) {
        room.property = property;
      }
    } catch (propErr) {
      console.warn('⚠️ Property enrichment failed:', propErr.message || propErr);
      if (propErr.response?.data) {
        console.warn('📄 Astra property error:', JSON.stringify(propErr.response.data, null, 2));
      }
    }
  }

  return c.json({
    success: true,
    room,
    timestamp,
  });
};
