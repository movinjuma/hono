import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getCollection } from '../../services/astra.js';
import { assignToken } from '../../utils/auth.js';

const USERS_COLLECTION = 'users';
const ALLOWED_ROLES = ['landlord', 'dual', 'tenant'];
let allowCeoOnce = true; // One-time CEO registration flag

const register = async (c) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const { email, password, phoneNumber, role } = await c.req.json();

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return c.json({ success: false, error: 'EMAIL_FORMAT_ERROR', message: 'Invalid email format.', timestamp }, 400);
    }

    if (password?.length < 8) {
      return c.json({ success: false, error: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.', timestamp }, 400);
    }

    const isRoleAllowed = ALLOWED_ROLES.includes(role) || (role === 'ceo' && allowCeoOnce);
    if (role && !isRoleAllowed) {
      return c.json({ success: false, error: 'INVALID_ROLE', message: `Invalid role: ${role}`, timestamp }, 400);
    }

    const usersCollection = await getCollection(USERS_COLLECTION);
    const [emailResult, phoneResult] = await Promise.all([
      usersCollection.find({ email: { $eq: normalizedEmail } }),
      phoneNumber ? usersCollection.find({ phonenumber: { $eq: phoneNumber } }) : Promise.resolve({ data: {} }),
    ]);

    const emailExists = Object.values(emailResult?.data || {})[0];
    const phoneExists = Object.values(phoneResult?.data || {})[0];

    if (emailExists) return c.json({ success: false, error: 'EMAIL_EXISTS', message: 'Email already registered.', timestamp }, 409);
    if (phoneExists) return c.json({ success: false, error: 'PHONE_EXISTS', message: 'Phone number already registered.', timestamp }, 409);

    const hashedPassword = await bcrypt.hash(password, 10);
    const auditMeta = {
      ip: c.req.header('x-forwarded-for') || c.req.header('host') || '',
      userAgent: c.req.header('user-agent') || '',
      traceId: crypto.randomUUID(),
    };

    const userId = crypto.randomUUID();
    const now = new Date();

    const newUser = {
      _id: userId,
      id: userId,
      email: normalizedEmail,
      password: hashedPassword,
      phonenumber: phoneNumber || null,
      role: role || 'tenant',
      status: 'UNCONFIRMED',
      emailverified: false,
      phoneverified: false,
      createdat: now,
      updatedat: now,
      logincount: 0,
      lastlogin: null,
      audit_ip: auditMeta.ip,
      audit_useragent: auditMeta.userAgent,
      audit_traceid: auditMeta.traceId,
      marketingoptin: false,
      notify_email: true,
      notify_sms: false,
    };

    await usersCollection.post(newUser);

    if (role === 'ceo' && allowCeoOnce) {
      allowCeoOnce = false;
      console.log('🧪 CEO registration allowed once. Locking further attempts.');
    }

    const token = await assignToken({ userId, email: normalizedEmail, role: newUser.role });

    c.header('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

    const duration = Date.now() - startTime;
    console.log(`✅ Registration completed in ${duration}ms for ${normalizedEmail}`);

    return c.json({ success: true, message: 'Registration successful.', userId, role: newUser.role, token, timestamp }, 201);
  } catch (error) {
    console.error('🔥 Unexpected registration error:', error.message || error);
    return c.json({ success: false, error: 'UNEXPECTED_ERROR', message: 'Unexpected server error.', timestamp }, 500);
  }
};

export default register;
