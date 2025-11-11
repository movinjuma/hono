import { getCollection } from '../../services/astra.js';

/**
 * GET /users/:id
 * Retrieves a single user by ID from the Astra DB "users" collection.
 */
export const getUserById = async (c) => {
  const timestamp = new Date().toISOString();
  const userId = c.req.param('id');

  if (!userId || typeof userId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_USER_ID',
        message: 'User ID is required and must be a string.',
        timestamp,
      },
      400
    );
  }

  let usersCollection;
  try {
    usersCollection = await getCollection('users');
    if (!usersCollection?.find || typeof usersCollection.find !== 'function') {
      throw new Error('Invalid Astra DB collection: missing .find() method.');
    }
    console.log('📦 Connected to collection: users');
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

  let user;
  try {
    const result = await usersCollection.find({ _id: userId });
    const entries = Object.entries(result?.data || {});
    if (entries.length === 0) {
      return c.json(
        {
          success: false,
          error: 'USER_NOT_FOUND',
          message: `No user found with ID: ${userId}`,
          timestamp,
        },
        404
      );
    }
    [, user] = entries[0];
  } catch (queryErr) {
    console.error('❌ Error fetching user by ID:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to fetch user.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    data: user,
    timestamp,
  });
};
