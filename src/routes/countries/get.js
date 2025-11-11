import { getCollection } from '../../services/astra.js';

/**
 * GET /countries
 * Returns all countries from the Astra DB "countries" collection.
 * Public access.
 */
export const getCountries = async (c) => {
  try {
    const countriesCollection = await getCollection('countries');
    const result = await countriesCollection.find({});
    const countries = Object.values(result?.data || {});

    return c.json({
      success: true,
      count: countries.length,
      data: countries,
    });
  } catch (err) {
    console.error('❌ Error fetching countries:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: 'Unable to retrieve countries at this time.',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
};
