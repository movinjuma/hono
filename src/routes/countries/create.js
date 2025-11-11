import { getCollection } from '../../services/astra.js';

/**
 * POST /countries
 * Creates a new country entry in the Astra DB "countries" collection.
 * Currently open-ended — no validation or schema enforcement yet.
 */
export const createCountry = async (c) => {
  const timestamp = new Date().toISOString();

  let body;
  try {
    body = await c.req.json();
  } catch (parseErr) {
    console.error('❌ Failed to parse request body:', parseErr.message || parseErr);
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

  try {
    const result = await countriesCollection.post(body);
    return c.json({
      success: true,
      message: 'Country created successfully.',
      insertedId: result?.documentId || null,
      timestamp,
    });
  } catch (insertErr) {
    console.error('❌ Error creating country:', insertErr.message || insertErr);
    if (insertErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(insertErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'INSERT_FAILED',
        message: insertErr.message || 'Failed to create country.',
        timestamp,
      },
      500
    );
  }
};
