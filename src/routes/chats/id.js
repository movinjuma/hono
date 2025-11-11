import { getCollection } from '../../services/astra.js';

/**
 * GET /chats/:id
 * Returns all messages for a specific chat from the "messages" collection.
 * Powers the chatroom screen (non-realtime).
 */
export const getMessagesForChat = async (c) => {
  const timestamp = new Date().toISOString();
  const chatId = c.req.param('id');

  if (!chatId || typeof chatId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_CHAT_ID',
        message: 'Chat ID must be a valid string.',
        timestamp,
      },
      400
    );
  }

  let messagesCollection;
  try {
    messagesCollection = await getCollection('messages');
    if (!messagesCollection?.find || typeof messagesCollection.find !== 'function') {
      throw new Error('Collection object missing .find() method.');
    }
    console.log('📦 Connected to collection: messages');
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

  let messages = [];
  try {
    const result = await messagesCollection.find({ chatId: { $eq: chatId } });
    messages = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
  } catch (queryErr) {
    console.error('❌ Message query failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve chat messages.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    chatId,
    count: messages.length,
    data: messages,
    timestamp,
  });
};
