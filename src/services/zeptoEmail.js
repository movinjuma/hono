const ZEPTO_URL = 'https://api.zeptomail.com/v1.1/email';

const SENDERS = {
  NO_REPLY: { address: 'noreply@housika.co.ke', name: 'Housika No Reply' },
  BOOKINGS: { address: 'bookings@housika.co.ke', name: 'Housika Bookings' },
  CUSTOMER_CARE: { address: 'customercare@housika.co.ke', name: 'Housika Customer Care' },
};

export class ZeptoMailError extends Error {
  constructor(message, data = null) {
    super(message);
    this.name = 'ZeptoMailError';
    this.data = data;
  }
}

let zeptoApiKey = null;
let setupError = null;
let setupPromise = null;

/**
 * Internal lazy initializer
 */
const ensureReady = async (env) => {
  if (setupError) throw setupError;
  if (zeptoApiKey) return;

  if (!setupPromise) {
    setupPromise = (async () => {
      zeptoApiKey = env?.ZEPTO_API_KEY || process.env.ZEPTO_API_KEY;
      if (!zeptoApiKey || !zeptoApiKey.startsWith('Zoho-')) {
        setupError = new ZeptoMailError('❌ ZeptoMail API key missing or malformed.');
      } else {
        console.log('🔐 ZeptoMail initialized with secure sender bindings.');
      }
    })();
  }

  await setupPromise;
  if (setupError) throw setupError;
};

/**
 * Initializes ZeptoMail utility with environment bindings
 * @param {object} env - Environment object (e.g., Cloudflare Worker bindings)
 * @returns {object} - Email sending methods
 */
export async function initZeptoMail(env) {
  await ensureReady(env);

  const formatRecipients = (to, name = 'User') => {
    if (!to) throw new ZeptoMailError('Recipient email(s) missing.');
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map(email => {
      if (typeof email !== 'string' || !email.includes('@')) {
        throw new ZeptoMailError(`Invalid recipient email: ${email}`);
      }
      return {
        email_address: {
          address: email,
          name,
        },
      };
    });
  };

  const sendEmail = async ({ sender, to, subject, htmlbody, recipientName = 'User' }) => {
    if (!sender?.address || !sender?.name) {
      throw new ZeptoMailError('Sender object is missing required fields.');
    }
    if (!to || !subject || !htmlbody) {
      throw new ZeptoMailError('Missing required parameters: to, subject, and htmlbody are mandatory.');
    }

    const payload = {
      from: sender,
      to: formatRecipients(to, recipientName),
      subject,
      htmlbody,
    };

    try {
      const res = await fetch(ZEPTO_URL, {
        method: 'POST',
        headers: {
          'Authorization': zeptoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ZeptoMailError(data.message || 'Email failed', data);
      }

      return data;
    } catch (err) {
      const errorDetails = err instanceof ZeptoMailError ? err.data : err.stack || err;
      console.error(`[ZEPTOMAIL ERROR] Failed to send email from ${sender.address} to ${to}.`, errorDetails);
      throw err instanceof ZeptoMailError ? err : new ZeptoMailError('Unexpected error during email dispatch.', errorDetails);
    }
  };

  return {
    sendVerificationEmail: (params) => sendEmail({ sender: SENDERS.NO_REPLY, ...params }),
    sendPasswordReset: (params) => sendEmail({ sender: SENDERS.NO_REPLY, ...params }),
    sendBookingConfirmation: (params) => sendEmail({ sender: SENDERS.BOOKINGS, ...params }),
    sendCustomerCareReply: (params) => sendEmail({ sender: SENDERS.CUSTOMER_CARE, ...params }),
  };
}
