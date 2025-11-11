import { getCollection } from '../../services/astra.js';

/**
 * GET /properties
 * Returns all properties from the Astra DB "properties" collection.
 */
export const getProperties = async (c) => {
  const timestamp = new Date().toISOString();

  let propertiesCollection;
  try {
    propertiesCollection = await getCollection('properties');
    console.log('📦 Connected to collection: properties');
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

  let properties = [];
  try {
    const result = await propertiesCollection.find({});
    properties = Object.values(result?.data || {});
  } catch (queryErr) {
    console.error('❌ Property query failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to fetch properties.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    count: properties.length,
    data: properties,
    timestamp,
  });
};
