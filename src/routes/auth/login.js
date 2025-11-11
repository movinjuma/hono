import bcrypt from 'bcryptjs';
import { assignToken, deleteAllTokens } from '../../utils/auth.js';
import { getCollection } from '../../services/astra.js';

const USERS_COLLECTION = 'users';
const isEmail = (identifier) => /\S+@\S+\.\S+/.test(identifier);
const isDev = process.env.NODE_ENV !== 'production';

const login = async (c) => {
  const timestamp = new Date().toISOString();

  try {
    const body = await c.req.json();
    const identifier = body?.identifier?.trim();
    const password = body?.password;

    if (!identifier || !password) {
      return c.json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Both identifier and password are required.',
        timestamp,
      }, 400);
    }

    const queryField = isEmail(identifier) ? 'email' : 'phonenumber';

    let usersCollection;
    try {
      usersCollection = await getCollection(USERS_COLLECTION);
    } catch (collectionError) {
      return c.json({
        success: false,
        error: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed.',
        timestamp,
      }, 503);
    }

    let user;
    try {
      const result = await usersCollection.find({ [queryField]: { $eq: identifier } });
      const matches = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
      user = matches[0] || null;
    } catch (queryError) {
      return c.json({
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Database query failed.',
        timestamp,
      }, 500);
    }

    if (!user) {
      return c.json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Account does not exist.',
        timestamp,
      }, 404);
    }

    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return c.json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'Incorrect password.',
          timestamp,
        }, 401);
      }
    } catch {
      return c.json({
        success: false,
        error: 'PASSWORD_CHECK_FAILED',
        message: 'Password verification failed.',
        timestamp,
      }, 500);
    }

    const userPayload = {
      userId: user._id || user.id || user.email,
      email: user.email,
      role: user.role || 'user',
    };

    try {
      await deleteAllTokens(userPayload.userId); // 🔒 Invalidate previous sessions
    } catch (cleanupError) {
      console.warn('⚠️ Failed to delete previous tokens:', cleanupError.message || cleanupError);
    }

    let token;
    try {
      token = await assignToken(userPayload);
    } catch {
      return c.json({
        success: false,
        error: 'TOKEN_GENERATION_FAILED',
        message: 'Authentication token generation failed.',
        timestamp,
      }, 500);
    }

    c.header(
      'Set-Cookie',
      `auth=${token}; HttpOnly; Path=/; SameSite=Strict${isDev ? '' : '; Secure'}`
    );

    return c.json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload,
      timestamp,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'Internal server error during login.',
      timestamp: new Date().toISOString(),
    }, 500);
  }
};

export default login;
