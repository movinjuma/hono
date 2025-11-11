import { initZeptoMail, ZeptoMailError } from '../../services/zeptoEmail.js';
import { checkToken } from '../../utils/auth.js';

/**
 * POST /emails/admin
 * Sends a professional admin email from Housika Properties.
 * Restricted to admin role.
 */
export const postAdminEmail = async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (parseErr) {
    console.error('Invalid JSON:', parseErr);
    return c.json({
      success: false,
      error: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
      timestamp: new Date().toISOString()
    }, 400);
  }

  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || user.role !== 'admin') {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Only admin can send this type of email.',
      timestamp: new Date().toISOString()
    }, 403);
  }

  const { to, message, time } = body;

  if (!to || !message || !time) {
    return c.json({
      success: false,
      error: 'Missing required fields: to, message, time'
    }, 400);
  }

  try {
    const zepto = initZeptoMail(c.env);

    const subject = `Housika Admin Notice – ${new Date(time).toLocaleDateString()}`;
    const htmlbody = `
      <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #333; padding: 40px; background-color: #f9f9f9;">
        <div style="max-width: 700px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); overflow: hidden;">
          <header style="background-color: #1b3bb3; color: #fff; padding: 20px 30px;">
            <h2 style="margin: 0;">Housika Properties – Admin Desk</h2>
            <p style="margin: 5px 0 0; font-size: 0.95em;">A Pansoft Technologies Kenya Subsidiary</p>
          </header>

          <main style="padding: 30px;">
            <p style="font-size: 1.1em;">Dear Stakeholder,</p>
            <p style="line-height: 1.6;">${message}</p>
            <p style="margin-top: 30px; font-size: 0.95em; color: #555;">
              This message was issued by the Housika Admin Desk and is logged for audit purposes.
            </p>
          </main>

          <footer style="background-color: #f0f0f0; padding: 20px 30px; font-size: 0.85em; color: #666;">
            <p style="margin: 0 0 10px;">
              Housika Properties is a technology platform operated under Pansoft Technologies Kenya (BN-36S5WLAP), a software development, design, and maintenance company.
            </p>
            <p style="margin: 0 0 10px;">
              Current CEO: <strong>Movin Wanjala Juma</strong>
            </p>
            <p style="margin: 0 0 10px;">
              For support or compliance matters, contact <a href="mailto:admin@housika.co.ke" style="color: #1b3bb3;">admin@housika.co.ke</a>
            </p>
            <div style="margin-top: 15px;">
              <a href="https://wa.me/254785103445" style="margin-right: 15px; text-decoration: none; color: #1b3bb3;">📱 WhatsApp</a>
              <a href="tel:+254785103445" style="margin-right: 15px; text-decoration: none; color: #1b3bb3;">📞 Call</a>
              <a href="sms:+254785103445" style="margin-right: 15px; text-decoration: none; color: #1b3bb3;">💬 Message</a>
              <a href="https://facebook.com/housikaproperties" style="text-decoration: none; color: #1b3bb3;">📘 Facebook</a>
            </div>
            <p style="margin-top: 20px; font-size: 0.8em; color: #999;">
              This message is confidential and intended for the recipient only. Please do not share sensitive data via email.
            </p>
          </footer>
        </div>
      </div>
    `;

    const result = await zepto.sendCustomerCareReply({
      to,
      subject,
      htmlbody,
      recipientName: 'Stakeholder'
    });

    return c.json({
      success: true,
      message: 'Admin email sent successfully.',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Email error:', err);

    if (err instanceof ZeptoMailError) {
      return c.json({
        success: false,
        error: 'EMAIL_SERVICE_ERROR',
        message: err.message,
        timestamp: new Date().toISOString()
      }, 500);
    }

    return c.json({
      success: false,
      error: 'REQUEST_ERROR',
      message: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
};
