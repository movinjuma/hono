import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';
import { v4 as uuid } from 'uuid';

const receipts = async (c) => {
  const start = Date.now();
  const traceId = c.req.header('x-trace-id') || uuid();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const timestamp = new Date().toISOString();

  const [user, receiptsCol] = await Promise.all([
    token ? checkToken(token) : null,
    getCollection('receipts'),
  ]);

  const allowedRoles = ['landlord', 'dual', 'agent', 'real estate company'];
  if (!user || !allowedRoles.includes(user.role)) {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Only authorized roles can generate receipts.',
      timestamp,
      traceId,
    }, 403);
  }

  let body;
  try {
    body = await c.req.json();
    if (!body || typeof body !== 'object') throw new Error('Invalid JSON');
  } catch (err) {
    console.error('❌ Body parse error:', err.message || err);
    return c.json({
      success: false,
      error: 'INVALID_BODY',
      message: 'Request body must be valid JSON.',
      timestamp,
      traceId,
    }, 400);
  }

  const receipt = {
    receipt_id: uuid(),
    created_by: user.userId,
    created_role: user.role,
    created_at: timestamp,
    ...body,
  };

  try {
    await receiptsCol.post(receipt);
    return c.json({
      success: true,
      message: 'Receipt saved successfully.',
      receipt_id: receipt.receipt_id,
      timestamp,
      traceId,
      duration: `${Date.now() - start}ms`,
    });
  } catch (err) {
    console.error('❌ Receipt insert failed:', err.message || err);
    if (err.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(err.response.data, null, 2));
    }
    return c.json({
      success: false,
      error: 'INSERT_FAILED',
      message: 'Unable to save receipt at this time.',
      timestamp,
      traceId,
    }, 500);
  }
};

export default receipts;
