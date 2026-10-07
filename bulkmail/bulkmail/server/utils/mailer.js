const nodemailer = require('nodemailer');

const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();
const fromName = String(process.env.FROM_NAME || 'Bulk Mailer').trim();

if (!smtpUser || !smtpPass) {
  throw new Error('SMTP_USER and SMTP_PASS must be configured in server/.env');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: smtpUser, pass: smtpPass },
});

const escapeHtml = value => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderTemplate = (value, vars = {}) => {
  let output = String(value || '');
  Object.keys(vars).forEach(key => {
    output = output.replaceAll(`{{${key}}}`, String(vars[key] ?? ''));
  });
  return output;
};

const buildStyledEmail = (html, name) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table width="600" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#4f46e5;padding:28px 32px;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;">${escapeHtml(fromName)}</h1>
        </td></tr>
        <tr><td style="padding:32px;color:#333333;font:15px Arial;line-height:1.7;">
          <p>Hi ${escapeHtml(name || 'there')},</p>
          ${html}
          <p style="margin-top:32px;">Best regards,<br/><strong>${escapeHtml(fromName)} Team</strong></p>
        </td></tr>
        <tr><td style="background:#f1f3f6;padding:18px;color:#888;font-size:12px;text-align:center;">
          You received this email because you are subscribed to our updates.<br/>
          © ${new Date().getFullYear()} ${escapeHtml(fromName)}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const sendBulk = async (recipients, subject, html) => {
  const results = { sent: [], failed: [] };
  const cleanSubject = String(subject || '').replace(/[\r\n]+/g, ' ').trim();

  for (const recipient of recipients) {
    const email = recipient.email.trim();
    const vars = { name: recipient.name || 'there', email };
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to: email,
        subject: renderTemplate(cleanSubject, vars),
        html: buildStyledEmail(renderTemplate(html, vars), recipient.name),
      });
      results.sent.push(email);
    } catch (error) {
      results.failed.push({ email, error: error.message });
    }
  }
  return results;
};

module.exports = { transporter, sendBulk };
