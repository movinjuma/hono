import { getCollection } from '../../../services/astra.js';
import { checkToken } from '../../../utils/auth.js';

/**
 * POST /auth/favorites
 * Adds a room or property to the user's favorites.
 */
export default async function postFavorite(c) {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = token ? await checkToken(token) : null;

  if (!user) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid token.', timestamp }, 401);
  }

  let body;
  try {
    body = await c.req.json();
    if (!body || typeof body !== 'object') throw new Error('Invalid JSON body.');
  } catch (err) {
    return c.json({ success: false, error: 'INVALID_BODY', message: err.message, timestamp }, 400);
  }

  const { item_id, item_type } = body;
  if (!item_id || !['room', 'property'].includes(item_type)) {
    return c.json({ success: false, error: 'INVALID_INPUT', message: 'item_id and valid item_type required.', timestamp }, 400);
  }

  let favoritesCol;
  try {
    favoritesCol = await getCollection('favorites');
    if (!favoritesCol?.post) {
      throw new Error('Collection object missing .post() method.');
    }
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({ success: false, error: 'DB_CONNECTION_FAILED', message: 'Database connection failed.', timestamp }, 503);
  }

  const favorite = {
    user_id: user.userId,
    item_id,
    item_type,
    created_at: timestamp,
  };

  try {
    await favoritesCol.post(favorite);
  } catch (insertErr) {
    console.error('❌ Favorite insertion failed:', insertErr.message || insertErr);
    if (insertErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(insertErr.response.data, null, 2));
    }
    return c.json({ success: false, error: 'INSERT_FAILED', message: 'Failed to add favorite.', timestamp }, 500);
  }

  return c.json({ success: true, message: 'Favorite added.', timestamp });
}
