const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f6f8fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 32px 28px; }
  .brand { margin: 0 0 26px; }
  .brand-name { font-weight: 800; font-size: 19px; line-height: 1.1; color: #0b2545; letter-spacing: -0.5px; }
  .brand-accent { color: #2874d0; }
  .brand-tagline { padding-top: 5px; font-size: 9px; line-height: 1.2; color: #64748b; font-weight: 700; letter-spacing: 1.5px; }
  h1 { font-size: 22px; line-height: 1.25; margin: 0 0 10px 0; font-weight: 700; color: #0b2545; }
  p { font-size: 14.5px; line-height: 1.65; color: #334155; margin: 0 0 14px 0; }
  .muted { color: #64748b; font-size: 13px; }
  .btn { display: inline-block; background: #1d4ed8; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14.5px; letter-spacing: 0.01em; margin: 10px 0 18px 0; }
  .btn:hover { background: #1e40af; }
  .fallback { word-break: break-all; font-size: 12.5px; color: #475569; background: #f1f5f9; border-radius: 8px; padding: 10px 12px; }
  .footer { margin-top: 22px; }
  .footer p { font-size: 12.5px; color: #94a3b8; line-height: 1.6; }
  a { color: #1d4ed8; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
`;

const layout = (title, body) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <table class="brand" role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="48" height="48" align="center" valign="middle" bgcolor="#0b2545" style="width:48px;height:48px;border-radius:12px;background:#0b2545;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="28">
              <tr><td colspan="5" align="center" style="height:12px;color:#8dc5ff;font-size:12px;line-height:12px;">&#9650;</td></tr>
              <tr>
                <td width="3" height="3" bgcolor="#ffffff" style="background:#ffffff;"></td>
                <td width="4"></td>
                <td width="3" height="3" bgcolor="#ffffff" style="background:#ffffff;"></td>
                <td width="4"></td>
                <td width="3" height="3" bgcolor="#ffffff" style="background:#ffffff;"></td>
              </tr>
              <tr>
                <td width="3" height="12" bgcolor="#ffffff" style="background:#ffffff;"></td>
                <td width="4"></td>
                <td width="3" height="12" bgcolor="#ffffff" style="background:#ffffff;"></td>
                <td width="4"></td>
                <td width="3" height="12" bgcolor="#ffffff" style="background:#ffffff;"></td>
              </tr>
              <tr><td colspan="5" height="3" bgcolor="#8dc5ff" style="height:3px;background:#8dc5ff;"></td></tr>
            </table>
          </td>
          <td width="12" style="width:12px;"></td>
          <td valign="middle">
            <div class="brand-name">Civic<span class="brand-accent">Connect</span></div>
            <div class="brand-tagline">CITIZENS. CITIES. CONNECTED.</div>
          </td>
        </tr>
      </table>
      ${body}
    </div>
    <div class="footer">
      <p>This email was sent by CivicConnect. Please do not reply directly to this message. Report problems to your local civic authority through the app.</p>
      <p>&copy; ${new Date().getFullYear()} CivicConnect. Built for citizens & cities.</p>
    </div>
  </div>
</body>
</html>`;

const verifyEmail = ({ name, verifyLink }) =>
  layout(
    'Verify your CivicConnect email',
    `<h1>Hi ${name || 'there'}, verify your email</h1>
     <p>Thanks for joining CivicConnect. Please confirm your email address by clicking the button below. This link is valid for 24 hours.</p>
     <a class="btn" href="${verifyLink}">Verify email address</a>
     <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
     <div class="fallback"><a href="${verifyLink}">${verifyLink}</a></div>
     <hr />
     <p class="muted">If you didn't create a CivicConnect account, you can safely ignore this email.</p>`
  );

const verifyEmailOtp = ({ name, otp, expiresMinutes = 10 }) =>
  layout(
    'Your CivicConnect verification code',
    `<h1>Verify your email address</h1>
     <p>Hi ${escapeHtml(name || 'there')}, enter this verification code to finish creating your CivicConnect account:</p>
     <p style="font-size:30px;font-weight:800;letter-spacing:8px;color:#0b2545;text-align:center;padding:12px">${escapeHtml(otp)}</p>
     <p class="muted">This code expires in ${expiresMinutes} minutes. If you did not create an account, you can ignore this email.</p>`
  );

const resetPassword = ({ name, resetLink, expiresMinutes = 20 }) =>
  layout(
    'Reset your CivicConnect password',
    `<h1>Reset your password</h1>
     <p>Hi ${name || 'there'}, we received a request to reset the password for your CivicConnect account. The link below is valid for ${expiresMinutes} minutes.</p>
     <a class="btn" href="${resetLink}">Reset password</a>
     <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
     <div class="fallback"><a href="${resetLink}">${resetLink}</a></div>
     <hr />
     <p class="muted">If you didn't request a password reset, no action is needed. Your password will remain unchanged.</p>`
  );

const passwordChanged = ({ name, loginLink = `${clientUrl}/login` }) =>
  layout(
    'Your CivicConnect password was changed',
    `<h1>Password updated successfully</h1>
     <p>Hi ${name || 'there'}, this is a confirmation that your CivicConnect account password has been changed.</p>
     <p>If you did not make this change, please contact a site administrator immediately and reset your password.</p>
     <a class="btn" href="${loginLink}">Go to Login</a>`
  );

const officerWelcome = ({ name, email, temporaryPassword, loginLink = `${clientUrl}/login` }) =>
  layout(
    'Your CivicConnect municipal officer account',
    `<h1>Your municipal officer account is ready</h1>
     <p>Hi ${escapeHtml(name)}, an administrator created your CivicConnect municipal officer account.</p>
     <p><strong>Sign-in email:</strong> ${escapeHtml(email)}</p>
     <p><strong>Temporary password:</strong></p>
     <div class="fallback">${escapeHtml(temporaryPassword)}</div>
     <p>Sign in using the details above and change this temporary password as soon as possible. Do not share it with anyone.</p>
     <a class="btn" href="${escapeHtml(loginLink)}">Sign in to CivicConnect</a>`
  );

module.exports = {
  verifyEmail,
  verifyEmailOtp,
  resetPassword,
  passwordChanged,
  officerWelcome,
};
