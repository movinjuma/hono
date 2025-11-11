import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';
import { initZeptoMail } from '../../services/zeptoEmail.js';

/**
 * POST /contactMessages/reply
 * Sends a reply to a contact message and stores it in the DB.
 * Only accessible by customer care, admin, or ceo.
 */
export const replyToContactMessage = async (c) => {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const actor = token ? await checkToken(token) : null;

  if (!actor || !['customer care', 'admin', 'ceo'].includes(actor.role)) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only customer care, admin, or ceo can reply to messages.',
        timestamp,
      },
      403
    );
  }

  let body;
  try {
    body = await c.req.json();
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be valid JSON.');
    }
  } catch (err) {
    console.error('❌ Body parse error:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'INVALID_BODY',
        message: 'Request body must be valid JSON.',
        timestamp,
      },
      400
    );
  }

  const { message_id, reply_body } = body;
  if (!message_id || !reply_body) {
    return c.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'message_id and reply_body are required.',
        timestamp,
      },
      400
    );
  }

  let messagesCol, repliesCol;
  try {
    [messagesCol, repliesCol] = await Promise.all([
      getCollection('contact_messages'),
      getCollection('contact_replies'),
    ]);
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed.',
        timestamp,
      },
      503
    );
  }

  let originalMessage;
  try {
    const result = await messagesCol.find({ _id: message_id });
    originalMessage = Object.values(result?.data || {})[0];
    if (!originalMessage) {
      return c.json(
        {
          success: false,
          error: 'MESSAGE_NOT_FOUND',
          message: `No contact message found with ID "${message_id}".`,
          timestamp,
        },
        404
      );
    }
  } catch (queryErr) {
    console.error('❌ Message lookup failed:', queryErr.message || queryErr);
    return c.json(
      {
        success: false,
        error: 'QUERY_FAILED',
        message: 'Failed to retrieve contact message.',
        timestamp,
      },
      500
    );
  }

  const replyRecord = {
    message_id,
    customer_id: originalMessage.user_id || null,
    customer_email: originalMessage.email,
    reply_body,
    served_by_id: actor.userId,
    served_by_name: actor.name || actor.email,
    served_by_role: actor.role,
    replied_at: timestamp,
    audit_ip: c.req.header('x-forwarded-for') || '',
    audit_useragent: c.req.header('user-agent') || '',
    audit_traceid: c.req.header('x-trace-id') || '',
  };

  try {
    await repliesCol.post(replyRecord);
  } catch (insertErr) {
    console.error('❌ Reply insert failed:', insertErr.message || insertErr);
    return c.json(
      {
        success: false,
        error: 'INSERT_FAILED',
        message: 'Failed to store reply.',
        timestamp,
      },
      500
    );
  }

  // 📧 Send reply email
  try {
    const zepto = initZeptoMail(c.env);
    await zepto.sendCustomerCareReply({
      to: originalMessage.email,
      subject: `Reply from Housika Customer Care`,
      htmlbody: `<p>Dear ${originalMessage.name},</p><p>${reply_body}</p><p>Regards,<br/>Housika Customer Care</p>`,
      recipientName: originalMessage.name,
    });
  } catch (emailErr) {
    console.error('❌ Email dispatch failed:', emailErr.message || emailErr);
  }

  return c.json({
    success: true,
    message: 'Reply sent and stored successfully.',
    replied_at: timestamp,
    served_by: replyRecord.served_by_name,
  });
};
