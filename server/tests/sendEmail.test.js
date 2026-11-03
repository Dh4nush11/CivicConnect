const test = require('node:test');
const assert = require('node:assert/strict');
const { sendEmail } = require('../utils/sendEmail');

test('Resend API sends transactional email over HTTPS', async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  const originalFetch = global.fetch;
  let request;

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
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalFrom;
  }
});

test('Resend API errors are surfaced to the caller', async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFetch = global.fetch;

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
      /Resend email send failed: domain is not verified/
    );
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  }
});
