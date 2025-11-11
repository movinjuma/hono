import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';
import { initR2 } from '../../services/r2.js';

/**
 * DELETE /banners/:id
 * Only admin or ceo can delete a banner and its image from R2.
 */
export const deleteBanner = async (c) => {
  const timestamp = new Date().toISOString();
  const bannerId = c.req.param('id');
  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || !['admin', 'ceo'].includes(user.role)) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only admin or ceo can delete banners.',
        timestamp,
      },
      403
    );
  }

  let bannersCollection;
  try {
    bannersCollection = await getCollection('banners');
    if (!bannersCollection?.find || !bannersCollection?.delete) {
      throw new Error('Collection object missing required methods.');
    }
    console.log('📦 Connected to collection: banners');
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

  let banner;
  try {
    const result = await bannersCollection.find({ _id: { $eq: bannerId } });
    const matches = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
    banner = matches[0] || null;
  } catch (queryErr) {
    console.error('❌ Failed to query banner:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve banner.',
        timestamp,
      },
      500
    );
  }

  if (!banner) {
    return c.json(
      {
        success: false,
        error: 'BANNER_NOT_FOUND',
        message: 'Banner not found.',
        timestamp,
      },
      404
    );
  }

  const imageUrl = banner.image;
  const key = imageUrl?.split('/').slice(-2).join('/'); // assumes format: endpoint/bucket/key

  try {
    await bannersCollection.delete(bannerId);
    console.log(`🗑️ Deleted banner document: ${bannerId}`);
  } catch (deleteErr) {
    console.error('❌ Failed to delete banner:', deleteErr.message || deleteErr);
    if (deleteErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(deleteErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete banner.',
        timestamp,
      },
      500
    );
  }

  if (key) {
    try {
      const r2 = initR2();
      await r2.deleteFile(key);
      console.log(`🧹 Deleted image from R2: ${key}`);
    } catch (r2Err) {
      console.warn('⚠️ Failed to delete image from R2:', r2Err.message || r2Err);
    }
  }

  return c.json({
    success: true,
    message: 'Banner and image deleted successfully.',
    timestamp,
  });
};
