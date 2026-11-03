const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
const user = process.env.SMTP_USER || process.env.EMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const RESEND_API_URL = 'https://api.resend.com/emails';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const getFrom = () =>
  process.env.EMAIL_FROM || `"CivicConnect" <${user || 'no-reply@civicconnect.local'}>`;

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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
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

const getPlainText = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const postEmail = async (url, headers, body, provider) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CivicConnect/1.0',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const responseBody = await response.text();
  let result;
  try {
    result = JSON.parse(responseBody);
  } catch {
    result = null;
  }

  if (!response.ok) {
    const detail = result?.message || result?.name || `HTTP ${response.status}`;
    throw new Error(`${provider} email send failed: ${detail}`);
  }

  return { ...result, provider };
};

const sendWithResend = ({ to, subject, html, text }) =>
  postEmail(
    RESEND_API_URL,
    { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    {
      from: getFrom(),
      to,
      subject,
      html,
      text: text || getPlainText(html),
    },
    'resend'
  );

const sendWithBrevo = ({ to, subject, html, text }) => {
  const sender = getFrom();
  const match = sender.match(/^(.*?)\s*<([^<>]+)>$/);
  const senderName = match ? match[1].replace(/^["']|["']$/g, '').trim() : 'CivicConnect';
  const senderEmail = match ? match[2].trim() : sender.trim();

  return postEmail(
    BREVO_API_URL,
    { 'api-key': process.env.BREVO_API_KEY },
    {
      sender: { name: senderName || 'CivicConnect', email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || getPlainText(html),
    },
    'Brevo'
  );
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.BREVO_API_KEY) {
    return sendWithBrevo({ to, subject, html, text });
  }

  if (process.env.RESEND_API_KEY) {
    return sendWithResend({ to, subject, html, text });
  }

  const transport = await getTransport();
  const info = await transport.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text: text || getPlainText(html),
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
