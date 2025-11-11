import { getCollection } from '../../../services/astra.js';
import { checkToken } from '../../../utils/auth.js';

/**
 * DELETE /auth/favorites
 * Removes a favorite item for the authenticated user.
 */
export default async function deleteFavorite(c) {
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
    if (!favoritesCol?.find || !favoritesCol?.delete) {
      throw new Error('Collection object missing required methods.');
    }
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({ success: false, error: 'DB_CONNECTION_FAILED', message: 'Database connection failed.', timestamp }, 503);
  }

  let favorite;
  try {
    const result = await favoritesCol.find({
      user_id: { $eq: user.userId },
      item_id: { $eq: item_id },
      item_type: { $eq: item_type },
    });
    const matches = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
    favorite = matches[0] || null;
  } catch (queryErr) {
    console.error('❌ Favorite lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json({ success: false, error: 'DB_QUERY_FAILED', message: 'Failed to locate favorite.', timestamp }, 500);
  }

  if (!favorite || !favorite._id) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Favorite not found.', timestamp }, 404);
  }

  try {
    await favoritesCol.delete(favorite._id);
  } catch (deleteErr) {
    console.error('❌ Favorite deletion failed:', deleteErr.message || deleteErr);
    if (deleteErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(deleteErr.response.data, null, 2));
    }
    return c.json({ success: false, error: 'DELETE_FAILED', message: 'Failed to remove favorite.', timestamp }, 500);
  }

  return c.json({ success: true, message: 'Favorite removed.', timestamp });
}
