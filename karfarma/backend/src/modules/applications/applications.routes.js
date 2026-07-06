// ============================================================================
// مسیرهای (Routes) ثبت درخواست متقاضیان
// ============================================================================
// این مسیرها عمومی هستند (بدون توکن)، چون متقاضی نیازی به ثبت‌نام ندارد.
// آپلود فایل رزومه با میدل‌ور upload (multer) انجام می‌شود.
// نام فیلد فایل در فرم باید "resume" باشد.
// ============================================================================
const express = require("express");
const router = express.Router();

const upload = require("../../middlewares/upload");
const { getPublicForm, submitApplication } = require("./applications.controller");

// نمایش فرم برای متقاضی (بر اساس لینک اختصاصی)
router.get("/form/:slug", getPublicForm);

// ثبت درخواست + آپلود فایل‌ها:
//   - فیلد "resume" برای رزومه
//   - فیلدهای "file_<questionId>" برای سؤالات آپلود فایل
// از upload.any() استفاده می‌کنیم تا همه‌ی این فایل‌ها دریافت شوند.
router.post("/apply/:slug", upload.any(), submitApplication);

module.exports = router;
