const nodemailer = require('nodemailer');

let transporter = null;

// Initialize Transporter with environment credentials or fallback mock
function getTransporter() {
    if (transporter) return transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log(`[EmailService] ✅ SMTP Transporter initialized with host: ${process.env.SMTP_HOST}`);
    } else {
        console.log('[EmailService] ℹ️ SMTP credentials not found in .env. Running in development logger mode.');
        transporter = null;
    }
    return transporter;
}

/**
 * Generate modern, styled HTML email template for Guardian Invitation
 */
function buildGuardianInviteTemplate({ recipientName, senderName, senderPhone, accessCode, relationship }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeCircle Guardian Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; color: #F1F5F9; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%); padding: 30px; text-align: center; border-bottom: 2px solid #3B82F6; }
    .header h1 { margin: 0; color: #60A5FA; font-size: 24px; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; color: #94A3B8; font-size: 13px; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; font-weight: 600; color: #FFFFFF; margin-bottom: 12px; }
    .message-box { background-color: #0F172A; border-left: 4px solid #3B82F6; padding: 14px 18px; border-radius: 8px; margin: 16px 0; color: #CBD5E1; font-size: 14px; line-height: 1.5; }
    .code-card { background: linear-gradient(180deg, #0F172A 0%, #162032 100%); border: 1px solid #38BDF8; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #38BDF8; font-weight: 700; margin-bottom: 8px; }
    .code-value { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; font-family: monospace; }
    .code-subtext { font-size: 12px; color: #64748B; margin-top: 8px; }
    .actions { text-align: center; margin: 26px 0 16px 0; }
    .btn { display: inline-block; background-color: #2563EB; color: #FFFFFF; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; }
    .footer { background-color: #0F172A; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ SafeCircle Security Network</h1>
      <p>Personal Safety, Emergency SOS & Motion Theft Protection</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${recipientName || 'Guardian'},</div>
      <p style="color: #94A3B8; font-size: 14px; line-height: 1.5;">
        <strong>${senderName}</strong> (${relationship || 'Contact'}) has designated you as their <strong>Trusted Emergency Guardian</strong> on SafeCircle.
      </p>

      <div class="message-box">
        If ${senderName} triggers an emergency SOS, experiences a theft anomaly, or needs immediate assistance, you will be authorized to access their live GPS radar location and audio evidence.
      </div>

      <div class="code-card">
        <div class="code-label">Your Private Emergency Access Code</div>
        <div class="code-value">${accessCode}</div>
        <div class="code-subtext">Keep this code secure. You can use it in the SafeCircle Tracker Portal at any time.</div>
      </div>

      <div class="actions">
        <a href="https://safecircle.app/track?code=${accessCode}" class="btn">Open Live Incident Portal</a>
      </div>

      <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 20px;">
        Sender Phone: ${senderPhone || 'Not specified'}
      </p>
    </div>
    <div class="footer">
      SafeCircle Automated Security Service • Designed exclusively for Android 10+
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Dispatch an automated Guardian Invitation Email
 * @param {Object} options Recipient and sender details
 */
async function sendGuardianInvitationEmail({ recipientEmail, recipientName, senderName, senderPhone, accessCode, relationship }) {
    if (!recipientEmail || !recipientEmail.includes('@')) {
        console.log('[EmailService] Invalid recipient email. Skipping email dispatch.');
        return { success: false, reason: 'INVALID_EMAIL' };
    }

    const htmlContent = buildGuardianInviteTemplate({
        recipientName,
        senderName,
        senderPhone,
        accessCode,
        relationship
    });

    const mailOptions = {
        from: process.env.SMTP_FROM || '"SafeCircle Safety Network" <alerts@safecircle.app>',
        to: recipientEmail,
        subject: `🛡️ ${senderName} designated you as their Trusted Guardian on SafeCircle`,
        text: `Hello ${recipientName},\n\n${senderName} added you as their emergency guardian on SafeCircle.\n\nYour 6-digit emergency access code: ${accessCode}\n\nTracker Portal: https://safecircle.app/track?code=${accessCode}`,
        html: htmlContent,
    };

    const client = getTransporter();

    if (client) {
        try {
            const info = await client.sendMail(mailOptions);
            console.log(`[EmailService] ✉️ Guardian invitation email sent to ${recipientEmail} (ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('[EmailService Error] Failed to send email via SMTP:', error.message);
            return { success: false, error: error.message };
        }
    } else {
        // Development / Test logger mode
        console.log(`[EmailService Mock] ✉️ Simulated Guardian Email to: "${recipientEmail}" for Ward: "${senderName}" (Access Code: ${accessCode})`);
        return { success: true, simulated: true, accessCode };
    }
}

module.exports = {
    sendGuardianInvitationEmail,
};
