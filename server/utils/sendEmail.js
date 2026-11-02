const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
const user = process.env.SMTP_USER || process.env.EMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || `"CivicConnect" <${user || 'no-reply@civicconnect.local'}>`;

let testAccountPromise = null;
const getEtherealTestAccount = async () => {
  if (!testAccountPromise) {
    testAccountPromise = nodemailer.createTestAccount();
  }
  return testAccountPromise;
};

let cachedTransport = null;
const getTransport = async () => {
  if (cachedTransport) return cachedTransport;

  if (host && user && pass) {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return cachedTransport;
  }

  if (host || user || pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must all be configured');
  }

  if (process.env.SMTP_USE_ETHEREAL !== 'true') {
    throw new Error('SMTP is not configured; set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS');
  }

  const testAccount = await getEtherealTestAccount();
  cachedTransport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  cachedTransport._isEthereal = true;
  return cachedTransport;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transport = await getTransport();
  const info = await transport.sendMail({
    from,
    to,
    subject,
    html,
    text:
      text ||
      html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
  });

  if (transport._isEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n[Ethereal Email] To: ${to} | Subject: ${subject}`);
    console.log(`[Ethereal Preview URL] ${previewUrl}\n`);
    return { ...info, previewUrl, provider: 'ethereal' };
  }

  return { ...info, provider: 'smtp' };
};

module.exports = { sendEmail };
