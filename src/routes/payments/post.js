import { initializePayment } from '../../services/paystack.js';

const post = async (c) => {
  const timestamp = new Date().toISOString();

  let body;
  try {
    body = await c.req.json();
  } catch (parseErr) {
    console.error('❌ Failed to parse payment request body:', parseErr.message || parseErr);
    return c.json({
      success: false,
      error: 'INVALID_BODY',
      message: 'Request body must be valid JSON.',
      timestamp,
    }, 400);
  }

  try {
    const result = await initializePayment(body);
    return c.json({
      success: true,
      data: result,
      timestamp,
    });
  } catch (err) {
    console.error('❌ Payment init error:', err.message || err);
    return c.json({
      success: false,
      error: 'PAYMENT_INIT_FAILED',
      message: err.message || 'Failed to initialize payment.',
      timestamp,
    }, 500);
  }
};

export default post;
