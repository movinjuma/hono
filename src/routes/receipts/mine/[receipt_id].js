import { Hono } from 'hono';
import { getCollection } from '../../../services/astra.js';
import { checkToken } from '../../../utils/auth.js';

const mine = new Hono();

/**
 * GET /receipts/mine/:receipt_id
 * Fetches a single receipt created by the authenticated landlord or dual-role user.
 */
mine.get('/mine/:receipt_id', async (c) => {
  const timestamp = new Date().toISOString();
  const receiptId = c.req.param('receipt_id');
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = token ? await checkToken(token) : null;

  if (!user || !['landlord', 'dual'].includes(user.role)) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only landlords or dual-role users can access their receipts.',
        timestamp,
      },
      403
    );
  }

  if (!receiptId || typeof receiptId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_RECEIPT_ID',
        message: 'Receipt ID is required and must be a string.',
        timestamp,
      },
      400
    );
  }

  let receiptsCol;
  try {
    receiptsCol = await getCollection('receipts');
    console.log('📦 Connected to collection: receipts');
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

  let receipt;
  try {
    const result = await receiptsCol.find({
      receipt_id: receiptId,
      created_by: user.userId,
    });
    receipt = Object.values(result?.data || {})[0];

    if (!receipt) {
      return c.json(
        {
          success: false,
          error: 'RECEIPT_NOT_FOUND',
          message: 'Receipt not found or does not belong to you.',
          timestamp,
        },
        404
      );
    }
  } catch (queryErr) {
    console.error('❌ Receipt lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Unable to retrieve receipt at this time.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    receipt,
    timestamp,
  });
});

export default mine;
