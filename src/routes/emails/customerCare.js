import { initZeptoMail, ZeptoMailError } from '../../services/zeptoEmail.js';

/**
 * POST /emails/customercare
 * Sends a professional customer care email from Housika Properties.
 * Public access.
 */
export const postCustomerCareEmail = async (c) => {
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

  const { to, message, time } = body;

  if (!to || !message || !time) {
    return c.json({
      success: false,
      error: 'Missing required fields: to, message, time'
    }, 400);
  }

  try {
    const zepto = initZeptoMail(c.env);

    const subject = `Housika Customer Care Response – ${new Date(time).toLocaleDateString()}`;
    const htmlbody = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #b31b1b;">Housika Properties – Customer Care Desk</h2>
        <p>Dear Customer,</p>
        <p>${message}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;" />
        <p style="font-size: 0.9em; color: #555;">
          Housika Properties is a global house and land marketplace platform connecting landlords and tenants. 
          We are a subsidiary of Pansoft Technologies, Kenya (BN-36S5WLAP).
        </p>
        <p style="font-size: 0.9em; color: #555;">
          Please note: <strong>We do not collect rent on behalf of landlords.</strong> Our services include listing, application processing, and free tamper-proof receipt generation. 
          All receipts are verifiable by any party.
        </p>
        <p style="font-size: 0.9em; color: #555;">
          For privacy and security, <strong>do not share sensitive data</strong> with customer care officers. 
          If your concern requires confidentiality, please contact <a href="mailto:ceo@housika.co.ke">ceo@housika.co.ke</a>.
        </p>
        <p style="font-size: 0.9em; color: #555;">
          Thank you for choosing Housika Properties.
        </p>
        <p style="font-size: 0.9em; color: #b31b1b;">— Housika Customer Care Team</p>
      </div>
    `;

    const result = await zepto.sendCustomerCareReply({
      to,
      subject,
      htmlbody,
      recipientName: 'Customer'
    });

    return c.json({
      success: true,
      message: 'Email sent successfully.',
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
