import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';
import { initR2 } from '../../services/r2.js';

/**
 * PUT /banners/:id
 * Only admin or ceo can update a banner.
 * Deletes old image from R2 if replaced.
 */
export const updateBanner = async (c) => {
  const timestamp = new Date().toISOString();
  const bannerId = c.req.param('id');
  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || !['admin', 'ceo'].includes(user.role)) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only admin or ceo can update banners.',
        timestamp,
      },
      403
    );
  }

  let bannersCollection;
  try {
    bannersCollection = await getCollection('banners');
    if (!bannersCollection?.find || !bannersCollection?.patch) {
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

  let body;
  try {
    body = await c.req.json();
  } catch (parseErr) {
    console.error('❌ Failed to parse request body:', parseErr);
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

  // Compare image URLs
  const oldImageUrl = banner.image;
  const newImageUrl = body.image;

  if (oldImageUrl && newImageUrl && oldImageUrl !== newImageUrl) {
    try {
      const key = oldImageUrl.split('/').slice(-2).join('/');
      const r2 = initR2();
      await r2.deleteFile(key);
      console.log(`🧹 Deleted old image from R2: ${key}`);
    } catch (r2Err) {
      console.warn('⚠️ Failed to delete old image from R2:', r2Err.message || r2Err);
    }
  }

  try {
    await bannersCollection.patch(bannerId, body);
    console.log(`✏️ Updated banner document: ${bannerId}`);
  } catch (updateErr) {
    console.error('❌ Failed to update banner:', updateErr.message || updateErr);
    if (updateErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(updateErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update banner.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    message: 'Banner updated successfully.',
    timestamp,
  });
};
