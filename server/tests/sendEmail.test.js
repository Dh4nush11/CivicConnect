const test = require('node:test');
const assert = require('node:assert/strict');
const { sendEmail } = require('../utils/sendEmail');

test('Brevo API sends using a verified Gmail sender over HTTPS', async () => {
  const originalBrevoKey = process.env.BREVO_API_KEY;
  const originalResendKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  const originalFetch = global.fetch;
  let request;

  process.env.BREVO_API_KEY = 'test-brevo-key';
  delete process.env.RESEND_API_KEY;
  process.env.EMAIL_FROM = 'CivicConnect <sender@gmail.com>';
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ messageId: 'email-456' }), { status: 201 });
  };

  try {
    const result = await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test subject',
      html: '<p>Hello</p>',
    });

    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['api-key'], 'test-brevo-key');
    assert.deepEqual(JSON.parse(request.options.body), {
      sender: { name: 'CivicConnect', email: 'sender@gmail.com' },
      to: [{ email: 'recipient@example.com' }],
      subject: 'Test subject',
      htmlContent: '<p>Hello</p>',
      textContent: 'Hello',
    });
    assert.equal(result.messageId, 'email-456');
    assert.equal(result.provider, 'Brevo');
  } finally {
    global.fetch = originalFetch;
    if (originalBrevoKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalBrevoKey;
    if (originalResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendKey;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
  }
});

test('Resend API sends transactional email over HTTPS', async () => {
  const originalBrevoKey = process.env.BREVO_API_KEY;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  const originalFetch = global.fetch;
  let request;

  delete process.env.BREVO_API_KEY;
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM = 'CivicConnect <no-reply@example.com>';
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: 'email-123' }), { status: 200 });
  };

  try {
    const result = await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test subject',
      html: '<p>Hello</p>',
    });

    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers.Authorization, 'Bearer test-api-key');
    assert.deepEqual(JSON.parse(request.options.body), {
      from: 'CivicConnect <no-reply@example.com>',
      to: 'recipient@example.com',
      subject: 'Test subject',
      html: '<p>Hello</p>',
      text: 'Hello',
    });
    assert.equal(result.id, 'email-123');
    assert.equal(result.provider, 'resend');
  } finally {
    global.fetch = originalFetch;
    if (originalBrevoKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalBrevoKey;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
  }
});

test('Resend API errors are surfaced to the caller', async () => {
  const originalBrevoKey = process.env.BREVO_API_KEY;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFetch = global.fetch;

  delete process.env.BREVO_API_KEY;
  process.env.RESEND_API_KEY = 'test-api-key';
  global.fetch = async () =>
    new Response(JSON.stringify({ message: 'domain is not verified' }), { status: 403 });

  try {
    await assert.rejects(
      sendEmail({
        to: 'recipient@example.com',
        subject: 'Test subject',
        html: '<p>Hello</p>',
      }),
      /resend email send failed: domain is not verified/
    );
  } finally {
    global.fetch = originalFetch;
    if (originalBrevoKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalBrevoKey;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  }
});
