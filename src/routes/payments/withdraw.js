import { withdrawFunds } from '../../services/paystack.js';
import { checkToken } from '../../utils/auth.js';

const withdraw = async (c) => {
  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || user.role !== 'ceo') {
    return c.json({
      success: false,
      message: 'Unauthorized: Only ceo can withdraw funds.',
    }, 403);
  }

  try {
    const body = await c.req.json();
    const result = await withdrawFunds(body);
    return c.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('❌ Withdrawal error:', err.message || err);
    return c.json({
      success: false,
      message: err.message || 'Failed to withdraw funds.',
    }, 500);
  }
};

export default withdraw;
