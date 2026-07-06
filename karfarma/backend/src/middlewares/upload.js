// ============================================================================
// میدل‌ور آپلود فایل رزومه (با multer)
// ============================================================================
// فایل رزومه به صورت PDF در پوشه uploads/ ذخیره می‌شود.
// در نسخه اول فقط فایل ذخیره می‌شود؛ نیازی به خواندن/تحلیل متن PDF نیست.
// ============================================================================
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// مطمئن می‌شویم پوشه uploads وجود دارد
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// محل و نام‌گذاری فایل ذخیره‌شده
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // نام یکتا: زمان + عدد تصادفی + پسوند اصلی فایل
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `resume-${unique}${ext}`);
  },
});

// رزومه فقط PDF؛ فایل‌های سؤالات (file_<id>) هر نوعی می‌توانند باشند
function fileFilter(req, file, cb) {
  if (file.fieldname === "resume") {
    const isPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";
    if (isPdf) return cb(null, true);
    return cb(new Error("رزومه باید فایل PDF باشد."));
  }
  // سایر فایل‌ها (سؤالات آپلود فایل) بدون محدودیت نوع
  cb(null, true);
}

// حداکثر حجم ۵ مگابایت
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
