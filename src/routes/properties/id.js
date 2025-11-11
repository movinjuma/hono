import { getCollection } from '../../services/astra.js';

// ✅ UUID v4 format validator
const isUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * GET /properties/:id
 * Returns a specific property and its associated rooms.
 */
export const getPropertyById = async (c) => {
  const timestamp = new Date().toISOString();
  const propertyId = c.req.param('id');

  if (!propertyId || !isUUID(propertyId)) {
    return c.json(
      {
        success: false,
        error: 'INVALID_PROPERTY_ID',
        message: 'Property ID must be a valid UUID.',
        timestamp,
      },
      400
    );
  }

  let propertiesCollection, roomsCollection;
  try {
    propertiesCollection = await getCollection('properties');
    roomsCollection = await getCollection('rooms');
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

  let property;
  try {
    const result = await propertiesCollection.find({ property_id: { $eq: propertyId } });
    property = Object.values(result?.data || {})[0];

    if (!property) {
      return c.json(
        {
          success: false,
          error: 'PROPERTY_NOT_FOUND',
          message: `No property found with ID "${propertyId}".`,
          timestamp,
        },
        404
      );
    }
  } catch (queryErr) {
    console.error(`❌ Property query failed for ID ${propertyId}:`, queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra property query response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve property.',
        timestamp,
      },
      500
    );
  }

  let rooms = [];
  try {
    const roomResult = await roomsCollection.find({ property_id: { $eq: propertyId } });
    rooms = Object.values(roomResult?.data || {});
  } catch (roomErr) {
    console.warn(`⚠️ Room query failed for property_id ${propertyId}:`, roomErr.message || roomErr);
    if (roomErr.response?.data) {
      console.warn('📄 Astra room query response:', JSON.stringify(roomErr.response.data, null, 2));
    }
  }

  return c.json({
    success: true,
    data: {
      property,
      rooms,
    },
    timestamp,
  });
};
