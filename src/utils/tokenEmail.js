/**
 * Escapes HTML special characters to prevent injection
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a hybrid token email for OTP and password reset
 * @param {Object} params
 * @param {string} params.otp - One-time password (optional)
 * @param {string} params.resetLink - Password reset link (optional)
 * @param {string} params.recipientName - Name of the recipient (default: 'User')
 * @param {string} params.brand - Optional brand name override (default: 'Housika Properties')
 * @returns {string} HTML email body
 */
export function generateTokenEmail({
  otp,
  resetLink,
  recipientName = 'User',
  brand = 'Housika Properties',
}) {
  const hasOTP = typeof otp === 'string' && otp.trim().length > 0;
  const hasLink = typeof resetLink === 'string' && resetLink.trim().length > 0;

  if (!hasOTP && !hasLink) {
    throw new Error('At least one of otp or resetLink must be provided.');
  }

  const safeName = escapeHtml(recipientName);
  const safeBrand = escapeHtml(brand);
  const safeOtp = hasOTP ? escapeHtml(otp) : '';
  const safeLink = hasLink ? escapeHtml(resetLink) : '';

  return `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h2 style="color: #b31b1b;">${safeBrand} – Account Security</h2>
      <p>Dear ${safeName},</p>

      ${hasOTP ? `
        <p style="margin-top: 20px;">Your one-time verification code is:</p>
        <div style="font-size: 2em; font-weight: bold; color: #b31b1b; margin: 10px 0;">${safeOtp}</div>
        <p>This code is valid for a limited time and can be used on any device. Do not share it with anyone.</p>
      ` : ''}

      ${hasLink ? `
        <p style="margin-top: 30px;">You requested to reset your password. Click the button below to proceed:</p>
        <a href="${safeLink}" style="display: inline-block; background-color: #b31b1b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      ` : ''}

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;" />
      <p style="font-size: 0.9em; color: #555;">
        ${safeBrand} is a global house and land marketplace platform. For security concerns, do not share sensitive data via email.
        If you need confidential assistance, contact <a href="mailto:ceo@housika.co.ke">ceo@housika.co.ke</a>.
      </p>
      <p style="font-size: 0.9em; color: #b31b1b;">— ${safeBrand} Security Team</p>
    </div>
  `;
}
