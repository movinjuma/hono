import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * GET /contactMessages
 * Returns all contact messages for authorized roles.
 * Only accessible by customer care, admin, or ceo.
 */
export const getContactMessages = async (c) => {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const actor = token ? await checkToken(token) : null;

  if (!actor || !['customer care', 'admin', 'ceo'].includes(actor.role)) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only customer care, admin, or ceo can view contact messages.',
        timestamp,
      },
      403
    );
  }

  let contactMessages;
  try {
    contactMessages = await getCollection('contact_messages');
    if (!contactMessages?.find || typeof contactMessages.find !== 'function') {
      throw new Error('Collection "contact_messages" missing .find() method.');
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

  // Optional filters
  const emailFilter = c.req.query('email');
  const fromDate = c.req.query('from');
  const toDate = c.req.query('to');

  const query = {};
  if (emailFilter) query.email = { $eq: emailFilter };
  if (fromDate || toDate) {
    query.created_at = {};
    if (fromDate) query.created_at.$gte = fromDate;
    if (toDate) query.created_at.$lte = toDate;
  }

  let messages = [];
  try {
    const result = await contactMessages.find(query);
    messages = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (queryErr) {
    console.error('❌ Query failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'QUERY_FAILED',
        message: 'Failed to retrieve contact messages.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    count: messages.length,
    data: messages,
    timestamp,
  });
};
