import { getCollection } from '../../services/astra.js';

/**
 * GET /receipts/verify/:receipt_id
 * Public route to verify a receipt by its ID.
 */
const verify = async (c) => {
  const timestamp = new Date().toISOString();
  const receiptId = c.req.param('receipt_id');

  if (!receiptId || typeof receiptId !== 'string') {
    return c.json({
      success: false,
      error: 'INVALID_RECEIPT_ID',
      message: 'Receipt ID is required and must be a string.',
      timestamp,
    }, 400);
  }

  let receiptsCol;
  try {
    receiptsCol = await getCollection('receipts');
    console.log('📦 Connected to collection: receipts');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({
      success: false,
      error: 'DB_CONNECTION_FAILED',
      message: 'Database connection failed.',
      timestamp,
    }, 503);
  }

  let receipt;
  try {
    const result = await receiptsCol.find({ receipt_id: receiptId });
    receipt = Object.values(result?.data || {})[0];

    if (!receipt) {
      return c.json({
        success: false,
        error: 'RECEIPT_NOT_FOUND',
        message: 'Receipt not found or invalid.',
        timestamp,
      }, 404);
    }
  } catch (queryErr) {
    console.error('❌ Receipt lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json({
      success: false,
      error: 'DB_QUERY_FAILED',
      message: 'Unable to verify receipt at this time.',
      timestamp,
    }, 500);
  }

  return c.json({
    success: true,
    verified: true,
    receipt,
    timestamp,
  });
};

export default verify;
