import { getCollection } from '../../../services/astra.js';
import { checkToken } from '../../../utils/auth.js';

/**
 * GET /auth/favorites
 * Returns all favorites for the authenticated user.
 */
export default async function getFavorites(c) {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = token ? await checkToken(token) : null;

  if (!user) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid token.', timestamp }, 401);
  }

  let favoritesCol;
  try {
    favoritesCol = await getCollection('favorites');
    if (!favoritesCol?.find) {
      throw new Error('Collection object missing .find() method.');
    }
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({ success: false, error: 'DB_CONNECTION_FAILED', message: 'Database connection failed.', timestamp }, 503);
  }

  let favorites = [];
  try {
    const result = await favoritesCol.find({ user_id: { $eq: user.userId } });
    favorites = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
  } catch (queryErr) {
    console.error('❌ Favorites query failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json({ success: false, error: 'DB_QUERY_FAILED', message: 'Failed to fetch favorites.', timestamp }, 500);
  }

  return c.json({
    success: true,
    count: favorites.length,
    data: favorites,
    timestamp,
  });
}
