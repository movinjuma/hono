import bcrypt from 'bcryptjs';
import { getCollection } from '../../services/astra.js';
import { redis } from '../../utils/auth.js';

const USERS_COLLECTION = 'users';

const resetPassword = async (c) => {
  const timestamp = new Date().toISOString();

  try {
    const { token, otp, email, newPassword } = await c.req.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return c.json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters.',
        timestamp,
      }, 400);
    }

    if (!token && !(otp && email)) {
      return c.json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Token or OTP with email is required.',
        timestamp,
      }, 400);
    }

    let userId = null;

    if (token) {
      try {
        userId = await redis.get(`reset:${token}`);
        if (!userId) {
          return c.json({
            success: false,
            error: 'INVALID_TOKEN',
            message: 'Invalid or expired token.',
            timestamp,
          }, 400);
        }
        await redis.del(`reset:${token}`);
      } catch (redisErr) {
        console.error('❌ Redis token error:', redisErr.message || redisErr);
        return c.json({
          success: false,
          error: 'REDIS_ERROR',
          message: 'Failed to validate token.',
          timestamp,
        }, 500);
      }
    } else {
      const normalizedEmail = email.trim().toLowerCase();
      try {
        const storedOtp = await redis.get(`otp:${normalizedEmail}`);
        if (!storedOtp || storedOtp !== otp) {
          return c.json({
            success: false,
            error: 'INVALID_OTP',
            message: 'Invalid or expired OTP.',
            timestamp,
          }, 400);
        }
        await redis.del(`otp:${normalizedEmail}`);
      } catch (redisErr) {
        console.error('❌ Redis OTP error:', redisErr.message || redisErr);
        return c.json({
          success: false,
          error: 'REDIS_ERROR',
          message: 'Failed to validate OTP.',
          timestamp,
        }, 500);
      }

      let usersCollection;
      try {
        usersCollection = await getCollection(USERS_COLLECTION);
        if (!usersCollection?.find) {
          throw new Error('Collection object missing .find() method.');
        }
      } catch (err) {
        console.error('❌ DB connection error:', err.message || err);
        return c.json({
          success: false,
          error: 'DB_CONNECTION_FAILED',
          message: 'Database connection failed.',
          timestamp,
        }, 503);
      }

      let user;
      try {
        const result = await usersCollection.find({ email: { $eq: normalizedEmail } });
        const matches = result?.data && typeof result.data === 'object' ? Object.values(result.data) : [];
        user = matches[0] || null;

        if (!user) {
          return c.json({
            success: false,
            error: 'USER_NOT_FOUND',
            message: 'Account not found.',
            timestamp,
          }, 404);
        }

        userId = user.id || user._id;
      } catch (queryErr) {
        console.error('❌ User lookup failed:', queryErr.message || queryErr);
        if (queryErr.response?.data) {
          console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
        }
        return c.json({
          success: false,
          error: 'DB_QUERY_FAILED',
          message: 'Failed to retrieve user.',
          timestamp,
        }, 500);
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let usersCollection;
    try {
      usersCollection = await getCollection(USERS_COLLECTION);
      if (!usersCollection?.patch) {
        throw new Error('Collection object missing .patch() method.');
      }
    } catch (err) {
      console.error('❌ DB connection error:', err.message || err);
      return c.json({
        success: false,
        error: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed.',
        timestamp,
      }, 503);
    }

    try {
      await usersCollection.patch(userId, {
        password: hashedPassword,
        updatedat: new Date(),
      });
    } catch (updateErr) {
      console.error('❌ Password update failed:', updateErr.message || updateErr);
      if (updateErr.response?.data) {
        console.error('📄 Astra error response:', JSON.stringify(updateErr.response.data, null, 2));
      }
      return c.json({
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update password.',
        timestamp,
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Password reset successful.',
      timestamp,
    });
  } catch (err) {
    console.error('🔥 Reset-password error:', err.message || err);
    return c.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'Unexpected server error.',
      timestamp: new Date().toISOString(),
    }, 500);
  }
};

export default resetPassword;
