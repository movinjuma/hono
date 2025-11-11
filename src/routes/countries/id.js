import { getCollection } from '../../services/astra.js';

/**
 * GET /countries/:id
 * Retrieves a specific country document by its ID.
 */
export const getCountryById = async (c) => {
  const timestamp = new Date().toISOString();
  const countryId = c.req.param('id');

  if (!countryId || typeof countryId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_COUNTRY_ID',
        message: 'Country ID must be a valid string.',
        timestamp,
      },
      400
    );
  }

  let countriesCollection;
  try {
    countriesCollection = await getCollection('countries');
    console.log('📦 Connected to collection: countries');
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

  let country;
  try {
    const result = await countriesCollection.find({ _id: countryId });
    country = Object.values(result?.data || {})[0];
  } catch (queryErr) {
    console.error('❌ Country lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve country.',
        timestamp,
      },
      500
    );
  }

  if (!country) {
    return c.json(
      {
        success: false,
        error: 'COUNTRY_NOT_FOUND',
        message: `No country found with ID "${countryId}".`,
        timestamp,
      },
      404
    );
  }

  return c.json({
    success: true,
    data: country,
    timestamp,
  });
};
