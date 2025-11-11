import crypto from 'crypto';
import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * POST /banners
 * Only users with role "admin" or "ceo" can create a banner.
 */
export const createBanner = async (c) => {
  const timestamp = new Date().toISOString();
  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || !['admin', 'ceo'].includes(user.role)) {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Only admin or ceo can create banners.',
      timestamp,
    }, 403);
  }

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

  let bannersCollection;
  try {
    bannersCollection = await getCollection('banners');
    if (!bannersCollection?.post || typeof bannersCollection.post !== 'function') {
      throw new Error('Invalid Astra DB collection: missing .post() method.');
    }
    console.log('📦 Connected to collection: banners');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({
      success: false,
      error: 'DB_CONNECTION_FAILED',
      message: 'Database connection failed.',
      timestamp,
    }, 503);
  }

  const bannerId = crypto.randomUUID();
  const bannerToCreate = {
    id: bannerId,
    ...body,
    created_by: user.userId,
    created_at: timestamp,
  };

  try {
    await bannersCollection.post(bannerToCreate);
    return c.json({
      success: true,
      message: 'Banner created successfully.',
      insertedId: bannerId,
      timestamp,
    });
  } catch (insertErr) {
    console.error('❌ Error creating banner:', insertErr.message || insertErr);
    if (insertErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(insertErr.response.data, null, 2));
    }
    return c.json({
      success: false,
      error: 'INSERT_FAILED',
      message: 'Failed to create banner.',
      timestamp,
    }, 500);
  }
};
