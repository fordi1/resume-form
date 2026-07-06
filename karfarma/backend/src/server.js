// ============================================================================
// نقطه شروع سرور — Express
// ============================================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prisma = require("./config/prisma");

const app = express();

app.use(cors());
app.use(express.json());

// مسیر تست سلامت سرور
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend در حال اجراست ✅" });
});

// مسیرهای احراز هویت کارفرما (ثبت‌نام، ورود، خروج، پروفایل)
app.use("/api/auth", require("./modules/auth/auth.routes"));

// مسیرهای مدیریت موقعیت شغلی و فرم استخدام
app.use("/api/jobs", require("./modules/jobs/jobs.routes"));

// مسیرهای ثبت درخواست متقاضیان (عمومی)
app.use("/api/applications", require("./modules/applications/applications.routes"));

// مسیرهای پنل کارفرما (لیست/فیلتر متقاضیان، رزومه، تغییر وضعیت)
app.use("/api/admin", require("./modules/admin/admin.routes"));

// مدیریت مسیرهای پیدا‌نشده
app.use((req, res) => {
  res.status(404).json({ message: "مسیر موردنظر یافت نشد." });
});

// مدیریت خطاها (از جمله خطاهای آپلود فایل multer)
// این میدل‌ور باید آخرین مورد باشد.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  return res.status(400).json({ message: err.message || "خطای نامشخص." });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} اجرا شد: http://localhost:${PORT}`);
});
