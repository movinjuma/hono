import { getCollection } from '../../services/astra.js';

/**
 * POST /chats
 * Creates a new chat entry in the Astra DB "chats" collection.
 * If an initial message is included, it is stored in the "messages" collection.
 */
export const createChat = async (c) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  let body;
  try {
    body = await c.req.json();
    if (!body || typeof body !== 'object') {
      return c.json(
        {
          success: false,
          error: 'INVALID_BODY',
          message: 'Missing or invalid request body.',
          timestamp,
        },
        400
      );
    }
  } catch (parseErr) {
    console.error('❌ Failed to parse request body:', parseErr.message || parseErr);
    return c.json(
      {
        success: false,
        error: 'BODY_PARSE_FAILED',
        message: 'Request body must be valid JSON.',
        timestamp,
      },
      400
    );
  }

  const { initialMessage, ...chatData } = body;

  if (Object.keys(chatData).length === 0) {
    return c.json(
      {
        success: false,
        error: 'EMPTY_CHAT',
        message: 'Chat data is empty.',
        timestamp,
      },
      400
    );
  }

  chatData.createdAt = timestamp;
  chatData.audit_ip = c.req.header('x-forwarded-for') || '';
  chatData.audit_useragent = c.req.header('user-agent') || '';
  chatData.audit_traceid = c.req.header('x-trace-id') || '';

  let chatsCollection, messagesCollection;
  try {
    [chatsCollection, messagesCollection] = await Promise.all([
      getCollection('chats'),
      getCollection('messages'),
    ]);

    if (!chatsCollection?.insertOne || !messagesCollection?.insertOne) {
      throw new Error('Required collections are not available or invalid.');
    }
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

  let chatId;
  try {
    const chatResult = await chatsCollection.insertOne(chatData);
    chatId = chatResult?.insertedId;
    if (!chatId) throw new Error('Failed to insert chat.');
  } catch (insertErr) {
    console.error('❌ Chat insert failed:', insertErr.message || insertErr);
    if (insertErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(insertErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'CHAT_INSERT_FAILED',
        message: 'Failed to create chat.',
        timestamp,
      },
      500
    );
  }

  let messageInsertedId = null;
  if (initialMessage && typeof initialMessage === 'object') {
    try {
      const messagePayload = {
        ...initialMessage,
        chatId,
        createdAt: timestamp,
      };
      const messageResult = await messagesCollection.insertOne(messagePayload);
      messageInsertedId = messageResult?.insertedId || null;
    } catch (msgErr) {
      console.warn('⚠️ Initial message insert failed:', msgErr.message || msgErr);
      if (msgErr.response?.data) {
        console.warn('📄 Astra message error:', JSON.stringify(msgErr.response.data, null, 2));
      }
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Chat created in ${duration}ms with ID: ${chatId}`);

  return c.json(
    {
      success: true,
      message: 'Chat created successfully.',
      insertedId: chatId,
      messageInsertedId,
      timestamp,
      durationMs: duration,
    },
    201
  );
};
