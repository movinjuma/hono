import { checkToken } from '../../utils/auth.js';

const currentUser = async (c) => {
  const timestamp = new Date().toISOString();

  try {
    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie');

    let token = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return c.json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'No token provided.',
        timestamp,
      }, 401);
    }

    const payload = await checkToken(token);
    if (!payload) {
      return c.json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token.',
        timestamp,
      }, 401);
    }

    return c.json({
      success: true,
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      },
      timestamp,
    });
  } catch (err) {
    console.error('🔥 Token verification error:', err);
    return c.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'Unexpected server error.',
      timestamp,
    }, 500);
  }
};

export default currentUser;
