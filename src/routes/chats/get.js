import { getCollection } from '../../services/astra.js';

/**
 * GET /chats
 * Returns all chat entries from the Astra DB "chats" collection.
 * Currently open access — no user filtering yet.
 */
export const getChats = async (c) => {
  const timestamp = new Date().toISOString();

  let chatsCollection;
  try {
    chatsCollection = await getCollection('chats');
    if (!chatsCollection?.find || typeof chatsCollection.find !== 'function') {
      throw new Error('Collection object missing .find() method.');
    }
    console.log('📦 Connected to collection: chats');
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

  let chats = [];
  try {
    const result = await chatsCollection.find({});
    chats = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
  } catch (queryErr) {
    console.error('❌ Chat query failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Unable to retrieve chats at this time.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    count: chats.length,
    data: chats,
    timestamp,
  });
};
