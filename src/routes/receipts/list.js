import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * GET /receipts/mine
 * Lists all receipts created by the authenticated landlord or dual-role user.
 */
const list = async (c) => {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = token ? await checkToken(token) : null;

  if (!user || !['landlord', 'dual'].includes(user.role)) {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Only landlords or dual-role users can view their receipts.',
      timestamp,
    }, 403);
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

  let receipts = [];
  try {
    const result = await receiptsCol.find({ created_by: user.userId });
    receipts = Object.values(result?.data || {});
  } catch (queryErr) {
    console.error('❌ Receipt query failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json({
      success: false,
      error: 'DB_QUERY_FAILED',
      message: 'Unable to fetch receipts at this time.',
      timestamp,
    }, 500);
  }

  return c.json({
    success: true,
    count: receipts.length,
    receipts,
    timestamp,
  });
};

export default list;
