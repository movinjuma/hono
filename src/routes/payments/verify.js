import { verifyPayment } from '../../services/paystack.js';

/**
 * POST /payments/verify
 * Verifies a Paystack payment using its reference.
 * Public access.
 */
const verify = async (c) => {
  const timestamp = new Date().toISOString();

  let reference;
  try {
    const body = await c.req.json();
    reference = body?.reference;
    if (!reference || typeof reference !== 'string') {
      throw new Error('Missing or invalid payment reference.');
    }
  } catch (parseErr) {
    console.error('❌ Failed to parse verification request body:', parseErr.message || parseErr);
    return c.json({
      success: false,
      error: 'INVALID_BODY',
      message: 'Request body must contain a valid payment reference.',
      timestamp,
    }, 400);
  }

  try {
    const result = await verifyPayment(reference);
    return c.json({
      success: true,
      data: result,
      timestamp,
    });
  } catch (err) {
    console.error('❌ Payment verify error:', err.message || err);
    return c.json({
      success: false,
      error: 'VERIFICATION_FAILED',
      message: err.message || 'Failed to verify payment.',
      timestamp,
    }, 500);
  }
};

export default verify;
