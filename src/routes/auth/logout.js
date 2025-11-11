import { checkToken, deleteToken } from '../../utils/auth.js';

const logout = async (c) => {
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
        status: 'unauthorized',
        message: 'No token provided.',
      }, 401);
    }

    const payload = await checkToken(token);
    if (!payload) {
      return c.json({
        status: 'unauthorized',
        message: 'Invalid or expired token.',
      }, 401);
    }

    await deleteToken(payload.userId, token);

    c.header('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');

    return c.json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (err) {
    console.error('🔥 Logout error:', err);
    return c.json({
      status: 'error',
      message: 'Unexpected server error.',
    }, 500);
  }
};

export default logout;
