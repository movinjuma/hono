import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';
import { initZeptoMail } from '../../services/zeptoEmail.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const createUser = async (c) => {
  const start = Date.now();
  const traceId = c.req.header('x-trace-id') || crypto.randomUUID();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const timestamp = new Date().toISOString();

  const [creator, usersCollection] = await Promise.all([
    token ? checkToken(token) : null,
    getCollection('users'),
  ]);

  if (!creator || !['admin', 'customer care', 'ceo'].includes(creator.role)) {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Only admin, customer care, or ceo can create users.',
      timestamp,
      traceId,
    }, 403);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({
      success: false,
      error: 'INVALID_BODY',
      message: 'Request body must be valid JSON.',
      timestamp,
      traceId,
    }, 400);
  }

  const { email, password, role, phonenumber, fullname } = body;
  if (!email || !password || !role || !phonenumber || !fullname) {
    return c.json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Required fields: email, password, role, phonenumber, fullname.',
      timestamp,
      traceId,
    }, 400);
  }

  if (role === 'ceo') {
    return c.json({
      success: false,
      error: 'ROLE_NOT_ALLOWED',
      message: 'Cannot create user with role "ceo".',
      timestamp,
      traceId,
    }, 403);
  }

  try {
    const existing = await usersCollection.find({ email: { $eq: email } });
    if (Object.keys(existing?.data || {}).length > 0) {
      return c.json({
        success: false,
        error: 'USER_EXISTS',
        message: `User with email "${email}" already exists.`,
        timestamp,
        traceId,
      }, 409);
    }
  } catch (err) {
    console.error('❌ Lookup failed:', err.message || err);
    return c.json({
      success: false,
      error: 'LOOKUP_FAILED',
      message: 'Failed to check for existing user.',
      timestamp,
      traceId,
    }, 500);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();

  const userToCreate = {
    _id: userId,
    email,
    password: hashedPassword,
    role,
    phonenumber,
    fullname,
    created_by: creator.userId,
    created_at: timestamp,
  };

  try {
    await usersCollection.post(userToCreate);

    // Fire-and-forget email dispatch
    void (async () => {
      try {
        const zepto = await initZeptoMail(c.env);
        const subject = `Welcome to Housika – Account Created`;
        const htmlbody = generateWelcomeEmail(fullname);
        await zepto.sendCustomerCareReply({ to: email, subject, htmlbody, recipientName: fullname });
      } catch (emailErr) {
        console.warn('⚠️ Email dispatch failed:', emailErr.message || emailErr);
      }
    })();

    return c.json({
      success: true,
      message: 'User created successfully.',
      insertedId: userId,
      timestamp,
      traceId,
      duration: `${Date.now() - start}ms`,
    }, 201);
  } catch (err) {
    console.error('❌ Insert failed:', err.message || err);
    return c.json({
      success: false,
      error: 'INSERT_FAILED',
      message: 'Failed to create user.',
      timestamp,
      traceId,
    }, 500);
  }
};

/**
 * Generates welcome email HTML body
 */
function generateWelcomeEmail(name) {
  return `
    <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; padding: 40px; background-color: #f9f9f9;">
      <div style="max-width: 700px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); overflow: hidden;">
        <header style="background-color: #b31b1b; color: #fff; padding: 20px 30px;">
          <h2 style="margin: 0;">Welcome to Housika, ${name}!</h2>
          <p style="margin: 5px 0 0; font-size: 0.95em;">Your account has been created successfully.</p>
        </header>
        <main style="padding: 30px;">
          <p>You're now part of the Housika platform. You can log in and start managing your listings, bookings, or support tasks depending on your role.</p>
          <p>If you have any questions, reach us via WhatsApp at <strong>+254785103445</strong> or email <a href="mailto:customercare@housika.co.ke">customercare@housika.co.ke</a>.</p>
        </main>
        <footer style="background-color: #f0f0f0; padding: 20px 30px; font-size: 0.85em; color: #666;">
          <p>Housika Properties is a technology platform operated under Pansoft Technologies Kenya (BN-36S5WLAP).</p>
          <p>This message is confidential and intended for the recipient only.</p>
        </footer>
      </div>
    </div>
  `;
}
