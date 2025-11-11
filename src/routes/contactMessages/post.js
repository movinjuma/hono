import { getCollection } from '../../services/astra.js';
import { initZeptoMail } from '../../services/zeptoEmail.js';

export const postContactMessage = async (c) => {
  const start = Date.now();
  const traceId = c.req.header('x-trace-id') || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  let body;
  try {
    body = await c.req.json();
    if (!body || typeof body !== 'object') throw new Error('Invalid JSON');
  } catch {
    return c.json({
      success: false,
      error: 'INVALID_BODY',
      message: 'Request body must be valid JSON.',
      timestamp,
      traceId,
    }, 400);
  }

  const { name, email, message } = body;
  if (!name || !email || !message) {
    return c.json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Name, email, and message are required.',
      timestamp,
      traceId,
    }, 400);
  }

  let contactMessages;
  try {
    contactMessages = await getCollection('contact_messages');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({
      success: false,
      error: 'DB_CONNECTION_FAILED',
      message: 'Database connection failed.',
      timestamp,
      traceId,
    }, 503);
  }

  const audit = {
    ip: c.req.header('x-forwarded-for') || '',
    useragent: c.req.header('user-agent') || '',
    traceid: traceId,
  };

  const messageRecord = {
    name,
    email,
    message,
    created_at: timestamp,
    ...audit,
  };

  let result;
  try {
    result = await contactMessages.post(messageRecord);
  } catch (err) {
    console.error('❌ Insert failed:', err.message || err);
    return c.json({
      success: false,
      error: 'INSERT_FAILED',
      message: 'Unable to save your message.',
      timestamp,
      traceId,
    }, 500);
  }

  // 📧 Trigger customer care email
  try {
    const zepto = await initZeptoMail(c.env);
    const subject = `Housika Customer Message Received – ${new Date().toLocaleDateString()}`;
    const htmlbody = generateCustomerCareEmail(name);

    await zepto.sendCustomerCareReply({
      to: email,
      subject,
      htmlbody,
      recipientName: name,
    });
  } catch (err) {
    console.error('❌ Email dispatch failed:', err.message || err);
  }

  return c.json({
    success: true,
    message: '✅ Message received successfully. Our Customer Care Desk will respond shortly.',
    id: result.documentId || result.insertedId || null,
    timestamp,
    traceId,
    duration: `${Date.now() - start}ms`,
  });
};

/**
 * Generates the HTML body for customer care email
 */
function generateCustomerCareEmail(name) {
  return `
    <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #333; padding: 40px; background-color: #f9f9f9;">
      <div style="max-width: 700px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); overflow: hidden;">
        <header style="background-color: #b31b1b; color: #fff; padding: 20px 30px;">
          <h2 style="margin: 0;">Housika Properties – Customer Care Desk</h2>
          <p style="margin: 5px 0 0; font-size: 0.95em;">A Pansoft Technologies Kenya Subsidiary</p>
        </header>
        <main style="padding: 30px;">
          <p style="font-size: 1.1em;">Dear ${name},</p>
          <p style="line-height: 1.6;">
            Thank you for contacting Housika Properties. Your message has been received and assigned to a support officer.
            We aim to respond within 24 hours. For urgent matters, reach us via WhatsApp at <strong>+254785103445</strong>.
          </p>
          <p style="margin-top: 30px; font-size: 0.95em; color: #555;">
            This message is logged for audit purposes. Please do not share sensitive data via email.
          </p>
        </main>
        <footer style="background-color: #f0f0f0; padding: 20px 30px; font-size: 0.85em; color: #666;">
          <p style="margin: 0 0 10px;">
            Housika Properties is a technology platform operated under Pansoft Technologies Kenya (BN-36S5WLAP).
          </p>
          <p style="margin: 0 0 10px;">
            For support, contact <a href="mailto:customercare@housika.co.ke" style="color: #b31b1b;">customercare@housika.co.ke</a>
          </p>
          <div style="margin-top: 15px;">
            <a href="https://wa.me/254785103445" style="margin-right: 15px; text-decoration: none; color: #b31b1b;">📱 WhatsApp</a>
            <a href="tel:+254785103445" style="margin-right: 15px; text-decoration: none; color: #b31b1b;">📞 Call</a>
            <a href="sms:+254785103445" style="margin-right: 15px; text-decoration: none; color: #b31b1b;">💬 Message</a>
            <a href="https://facebook.com/housikaproperties" style="text-decoration: none; color: #b31b1b;">📘 Facebook</a>
          </div>
          <p style="margin-top: 20px; font-size: 0.8em; color: #999;">
            This message is confidential and intended for the recipient only.
          </p>
        </footer>
      </div>
    </div>
  `;
}
