// ============================================================================
// کنترلر احراز هویت کارفرما
// ============================================================================
// اینجا منطق اصلی ثبت‌نام، ورود، خروج و گرفتن پروفایل نوشته شده است.
//
// نکته امنیتی درباره هش کردن رمز عبور:
//   - رمز خام کاربر هرگز در دیتابیس ذخیره نمی‌شود.
//   - با کتابخانه bcryptjs رمز را «هش» می‌کنیم (bcrypt.hash).
//   - هش یک‌طرفه است؛ یعنی نمی‌توان از روی آن رمز اصلی را به‌دست آورد.
//   - هنگام ورود، رمز واردشده را با bcrypt.compare با هش ذخیره‌شده مقایسه می‌کنیم.
//   - عدد 10 «تعداد دورهای نمک (salt rounds)» است؛ هرچه بیشتر، امن‌تر ولی کندتر.
// ============================================================================
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");
const { signToken } = require("../../utils/jwt");
const { sendResetPasswordEmail } = require("../../utils/mailer");

const SALT_ROUNDS = 10;

// حذف فیلد رمز از خروجی، تا هرگز به کاربر برنگردد
function safeEmployer(employer) {
  const { password, resetToken, resetTokenExpiry, ...rest } = employer;
  return rest;
}

// --------------------------------------------------------------------------
// ثبت‌نام کارفرما  —  POST /api/auth/register
// --------------------------------------------------------------------------
async function register(req, res) {
  try {
    const { email, password, fullName, company, phone } = req.body;

    // اعتبارسنجی ساده ورودی‌ها
    if (!email || !password) {
      return res.status(400).json({ message: "ایمیل و رمز عبور الزامی است." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "رمز عبور باید حداقل ۶ کاراکتر باشد." });
    }

    // آیا این ایمیل قبلاً ثبت شده است؟
    const existing = await prisma.employer.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "این ایمیل قبلاً ثبت شده است." });
    }

    // هش کردن رمز عبور
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ساخت کارفرمای جدید
    const employer = await prisma.employer.create({
      data: {
        email,
        password: hashedPassword,
        fullName: fullName || null,
        company: company || null,
        phone: phone || null,
      },
    });

    // ساخت توکن برای ورود خودکار بعد از ثبت‌نام
    const token = signToken({ id: employer.id, email: employer.email });

    return res.status(201).json({
      message: "ثبت‌نام با موفقیت انجام شد.",
      token,
      employer: safeEmployer(employer),
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "خطای سرور در ثبت‌نام." });
  }
}

// --------------------------------------------------------------------------
// ورود کارفرما  —  POST /api/auth/login
// --------------------------------------------------------------------------
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "ایمیل و رمز عبور الزامی است." });
    }

    // پیدا کردن کارفرما با ایمیل
    const employer = await prisma.employer.findUnique({ where: { email } });

    // پیام یکسان برای ایمیل نادرست یا رمز نادرست (برای امنیت بیشتر)
    if (!employer) {
      return res.status(401).json({ message: "ایمیل یا رمز عبور اشتباه است." });
    }

    // مقایسه رمز واردشده با هش ذخیره‌شده
    const isMatch = await bcrypt.compare(password, employer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "ایمیل یا رمز عبور اشتباه است." });
    }

    if (!employer.isActive) {
      return res.status(403).json({ message: "حساب کاربری غیرفعال است." });
    }

    const token = signToken({ id: employer.id, email: employer.email });

    return res.status(200).json({
      message: "ورود موفق.",
      token,
      employer: safeEmployer(employer),
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "خطای سرور در ورود." });
  }
}

// --------------------------------------------------------------------------
// خروج کارفرما  —  POST /api/auth/logout
// --------------------------------------------------------------------------
// چون از JWT استفاده می‌کنیم، خروج در سمت «کلاینت» انجام می‌شود:
// فرانت‌اند فقط توکن ذخیره‌شده را پاک می‌کند. این مسیر برای هماهنگی است.
async function logout(req, res) {
  return res.status(200).json({
    message: "خروج انجام شد. لطفاً توکن را در سمت کاربر حذف کنید.",
  });
}

// --------------------------------------------------------------------------
// گرفتن پروفایل کارفرمای واردشده  —  GET /api/auth/me  (محافظت‌شده)
// --------------------------------------------------------------------------
async function me(req, res) {
  try {
    const employer = await prisma.employer.findUnique({
      where: { id: req.employer.id },
    });
    if (!employer) {
      return res.status(404).json({ message: "کاربر یافت نشد." });
    }
    return res.status(200).json({ employer: safeEmployer(employer) });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// فراموشی رمز عبور  —  POST /api/auth/forgot-password
// --------------------------------------------------------------------------
// یک توکن بازیابی می‌سازد و مدت اعتبار آن را ۱ ساعت می‌گذارد.
// در نسخه واقعی این توکن باید ایمیل شود؛ در این نسخه برای سادگی، توکن را در
// پاسخ API و کنسول سرور برمی‌گردانیم (شبیه‌سازی ارسال ایمیل).
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "ایمیل الزامی است." });
    }

    const employer = await prisma.employer.findUnique({ where: { email } });

    // برای امنیت، حتی اگر ایمیل وجود نداشته باشد پیام یکسان می‌دهیم.
    if (!employer) {
      return res.status(200).json({
        message: "اگر این ایمیل ثبت شده باشد، لینک بازیابی ارسال می‌شود.",
      });
    }

    // ساخت توکن تصادفی امن
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // ۱ ساعت بعد

    await prisma.employer.update({
      where: { id: employer.id },
      data: { resetToken, resetTokenExpiry },
    });

    // ارسال واقعی ایمیل بازیابی از طرف ایمیل مرکزی سایت
    try {
      const info = await sendResetPasswordEmail(email, resetToken);
      console.log(`📧 ایمیل بازیابی رمز به ${email} ارسال شد. messageId: ${info.messageId}`);
    } catch (mailErr) {
      // اگر ارسال ایمیل با خطا مواجه شد، آن را لاگ می‌کنیم تا کاربر بلوکه نشود
      console.error("خطا در ارسال ایمیل بازیابی:", mailErr.message);
      return res.status(500).json({
        message: "ساخت توکن انجام شد اما ارسال ایمیل با خطا مواجه شد. تنظیمات SMTP را بررسی کنید.",
      });
    }

    return res.status(200).json({
      message: "ایمیل بازیابی رمز عبور برای شما ارسال شد. لطفاً صندوق ورودی خود را بررسی کنید.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// بازنشانی رمز عبور  —  POST /api/auth/reset-password
// --------------------------------------------------------------------------
// با توکن معتبر (که منقضی نشده باشد) رمز جدید را تنظیم می‌کند.
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "توکن و رمز جدید الزامی است." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "رمز عبور باید حداقل ۶ کاراکتر باشد." });
    }

    // پیدا کردن کارفرما با توکن معتبر و منقضی‌نشده
    const employer = await prisma.employer.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!employer) {
      return res.status(400).json({ message: "توکن نامعتبر یا منقضی شده است." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ذخیره رمز جدید و پاک کردن توکن
    await prisma.employer.update({
      where: { id: employer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({ message: "رمز عبور با موفقیت تغییر کرد. اکنون وارد شوید." });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

module.exports = { register, login, logout, me, forgotPassword, resetPassword };
