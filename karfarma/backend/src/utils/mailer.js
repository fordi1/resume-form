// ============================================================================
// ابزار ارسال ایمیل (Nodemailer)
// ============================================================================
// یک Transporter واقعی SMTP می‌سازد که اطلاعات اتصال را از فایل .env می‌خواند.
// مقادیر پیش‌فرض برای Mailtrap تنظیم شده‌اند تا بدون هیچ تنظیمی توسط کارفرما،
// ایمیل‌ها در محیط تست قابل مشاهده باشند.
// ============================================================================
const nodemailer = require("nodemailer");

// آدرس فرانت‌اند برای ساخت لینک بازیابی داخل ایمیل
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

// ساخت Transporter از روی متغیرهای محیطی (با مقادیر پیش‌فرض Mailtrap)
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 2525,
    // برای پورت 465 مقدار secure باید true باشد؛ برای 2525/587 مقدار false
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || "your-mailtrap-user",
      pass: process.env.SMTP_PASS || "your-mailtrap-pass",
    },
  });
}

// --------------------------------------------------------------------------
// قالب HTML شیک، فارسی و راست‌چین برای ایمیل بازیابی رمز
// --------------------------------------------------------------------------
function buildResetPasswordHtml(resetLink) {
  return `
  <!DOCTYPE html>
  <html lang="fa" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Tahoma, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:32px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px; max-width:92%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
              <!-- هدر -->
              <tr>
                <td style="background-color:#4f46e5; padding:28px 32px; text-align:center;">
                  <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:bold;">
                    🔑 بازیابی رمز عبور
                  </h1>
                  <p style="margin:6px 0 0; color:#e0e7ff; font-size:13px;">
                    سیستم مدیریت استخدام
                  </p>
                </td>
              </tr>

              <!-- بدنه -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:28px; text-align:right;">
                    کارفرمای گرامی، درخواست بازیابی رمز عبور شما ثبت شده است. برای تغییر رمز عبور خود روی دکمه زیر کلیک کنید. این لینک فقط ۱ ساعت اعتبار دارد.
                  </p>

                  <!-- دکمه -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:16px 0 24px;">
                        <a href="${resetLink}"
                           style="display:inline-block; background-color:#4f46e5; color:#ffffff; text-decoration:none; font-size:15px; font-weight:bold; padding:14px 36px; border-radius:12px;">
                          تغییر رمز عبور
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 8px; color:#94a3b8; font-size:12px; line-height:22px; text-align:right;">
                    اگر دکمه کار نکرد، لینک زیر را در مرورگر خود باز کنید:
                  </p>
                  <p style="margin:0; direction:ltr; text-align:left; word-break:break-all;">
                    <a href="${resetLink}" style="color:#4f46e5; font-size:12px;">${resetLink}</a>
                  </p>
                </td>
              </tr>

              <!-- پاورقی -->
              <tr>
                <td style="background-color:#f8fafc; padding:18px 32px; text-align:center; border-top:1px solid #e2e8f0;">
                  <p style="margin:0; color:#94a3b8; font-size:12px;">
                    اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

// --------------------------------------------------------------------------
// ارسال ایمیل بازیابی رمز
// @param {string} to      ایمیل کارفرما
// @param {string} token   توکن بازیابی
// @returns {Promise<object>} اطلاعات ارسال (messageId و ...)
// --------------------------------------------------------------------------
async function sendResetPasswordEmail(to, token) {
  const transporter = createTransporter();
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || "سیستم مدیریت استخدام <no-reply@karfarma.local>",
    to,
    subject: "🔑 بازیابی رمز عبور | سیستم مدیریت استخدام",
    html: buildResetPasswordHtml(resetLink),
  });

  return info;
}

module.exports = { sendResetPasswordEmail, buildResetPasswordHtml, createTransporter };
