import { getCollection } from '../../services/astra.js';

/**
 * GET /banners
 * Returns all banners from the Astra DB "banners" collection.
 * Public access.
 */
export const getBanners = async (c) => {
  const timestamp = new Date().toISOString();

  try {
    const bannersCollection = await getCollection('banners');

    if (!bannersCollection || typeof bannersCollection.find !== 'function') {
      throw new Error('Invalid Astra DB collection: missing .find() method.');
    }

    const result = await bannersCollection.find({});
    const banners = result?.data && typeof result.data === 'object'
      ? Object.values(result.data)
      : [];

    return c.json({
      success: true,
      count: banners.length,
      data: banners,
      timestamp,
    });
  } catch (err) {
    console.error('❌ Error fetching banners:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: 'Unable to retrieve banners at this time.',
        timestamp,
      },
      500
    );
  }
};
