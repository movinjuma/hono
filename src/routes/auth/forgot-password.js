import crypto from 'crypto';
import { getCollection } from '../../services/astra.js';
import { redis } from '../../utils/auth.js';
import { generateTokenEmail } from '../../utils/tokenEmail.js';
import { initZeptoMail } from '../../services/zeptoEmail.js';

const USERS_COLLECTION = 'users';

const forgotPassword = async (c) => {
  const timestamp = new Date().toISOString();

  try {
    const { email } = await c.req.json();
    if (!email || typeof email !== 'string') {
      return c.json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Email is required and must be a string.',
        timestamp,
      }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    let usersCollection;
    try {
      usersCollection = await getCollection(USERS_COLLECTION);
      if (!usersCollection?.find) {
        throw new Error('Collection object missing .find() method.');
      }
      console.log('📦 Connected to collection:', USERS_COLLECTION);
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
    } catch (queryErr) {
      console.error('❌ Failed to query user:', queryErr.message || queryErr);
      if (queryErr.response?.data) {
        console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
      }
      return c.json({
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'User lookup failed.',
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

    const resetToken = crypto.randomUUID();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = 3600;

    try {
      await redis.set(`reset:${resetToken}`, user.id, { ex: ttl });
      await redis.set(`otp:${normalizedEmail}`, otp, { ex: ttl });
    } catch (redisErr) {
      console.error('❌ Redis error:', redisErr.message || redisErr);
      return c.json({
        success: false,
        error: 'REDIS_ERROR',
        message: 'Failed to store reset token or OTP.',
        timestamp,
      }, 500);
    }

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const recipientName = user.fullname || 'User';

    const htmlbody = generateTokenEmail({
      resetLink,
      recipientName,
      brand: 'Housika Properties',
      otp,
    });

    const zepto = initZeptoMail(process.env);

    try {
      await zepto.sendPasswordReset({
        to: normalizedEmail,
        subject: 'Reset your Housika password',
        htmlbody,
        recipientName,
      });
    } catch (emailErr) {
      console.error('❌ Email dispatch failed:', emailErr.message || emailErr);
      return c.json({
        success: false,
        error: 'EMAIL_FAILED',
        message: 'Failed to send reset email.',
        timestamp,
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Reset link and OTP sent successfully. Check your email.',
      timestamp,
    });
  } catch (err) {
    console.error('🔥 Forgot-password error:', err.message || err);
    return c.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'Unexpected server error.',
      timestamp,
    }, 500);
  }
};

export default forgotPassword;
