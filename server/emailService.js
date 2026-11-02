const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'smtp_config.json');

function getSmtpConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.warn("Failed to read smtp_config.json:", e.message);
    }
  }

  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: (process.env.SMTP_SECURE !== 'false'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'تحويشة استغفار <noreply@tahwesha.app>'
  };
}

function saveSmtpConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function getTransporter() {
  const config = getSmtpConfig();
  if (!config.user || !config.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

/**
 * Send 6-digit OTP verification email to user
 */
async function sendVerificationEmail(toEmail, userName, code) {
  const transporter = getTransporter();
  const config = getSmtpConfig();

  const htmlContent = `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; background-color: #022c22; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid #047857; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 30px 20px; text-align: center; border-bottom: 2px solid #ca8a04;">
        <h1 style="color: #facc15; margin: 0; font-size: 24px; font-weight: 800;">تحويشة استغفار</h1>
        <p style="color: #6ee7b7; margin: 6px 0 0 0; font-size: 13px;">بركة الرزق ونور الاستغفار وحفظ الأموال</p>
      </div>
      <div style="padding: 30px 25px; line-height: 1.7; font-size: 14px;">
        <p style="margin: 0 0 15px 0;">أهلاً بك يا <strong>${userName || 'أخي الكريم'}</strong>،</p>
        <p style="margin: 0 0 20px 0; color: #cbd5e1;">لتأكيد وتفعيل حسابك والبدء في استخدام التطبيق بأمان، يرجى استخدام رمز التفعيل التالي:</p>
        <div style="background-color: #064e3b; border: 2px dashed #eab308; border-radius: 14px; padding: 20px; text-align: center; margin: 25px 0;">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 12px; color: #fef08a; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 15px 0 0 0; text-align: center;">
          ⚠️ هذا الرمز سري وصالح لمدة 15 دقيقة فقط. لا تشاركه مع أي شخص.
        </p>
      </div>
      <div style="background-color: #011d16; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #064e3b;">
        تطبيق تحويشة استغفار • جميع الحقوق محفوظة
      </div>
    </div>
  `;

  if (!transporter) {
    console.log("=================================================");
    console.log(`[SMTP NOTICE] No SMTP configured yet.`);
    console.log(`[OTP DISPATCH] To: ${toEmail} | Name: ${userName} | Code: ${code}`);
    console.log("Configure SMTP credentials in the Admin Dashboard to deliver real emails.");
    console.log("=================================================");
    return {
      sent: false,
      reason: "smtp_not_configured",
      code: code
    };
  }

  try {
    const info = await transporter.sendMail({
      from: config.from || `تحويشة استغفار <${config.user}>`,
      to: toEmail,
      subject: `رمز تفعيل حسابك في تحويشة استغفار: ${code}`,
      html: htmlContent
    });
    console.log(`[EMAIL SENT] Verification code sent to ${toEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message, code: code };
  }
}

module.exports = {
  getSmtpConfig,
  saveSmtpConfig,
  sendVerificationEmail
};
