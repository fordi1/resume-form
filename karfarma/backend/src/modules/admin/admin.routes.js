// ============================================================================
// مسیرهای (Routes) پنل کارفرما
// ============================================================================
// همه‌ی مسیرها با authGuard محافظت شده‌اند (فقط کارفرمای واردشده).
// ============================================================================
const express = require("express");
const router = express.Router();

const authGuard = require("../../middlewares/auth.middleware");
const {
  listApplicants,
  getApplicantDetail,
  downloadResume,
  downloadAnswerFile,
  updateApplicantStatus,
} = require("./admin.controller");

router.use(authGuard);

// لیست متقاضیان یک شغل (+ فیلترها و مرتب‌سازی)
router.get("/jobs/:id/applicants", listApplicants);

// مشاهده کامل یک متقاضی (پاسخ‌ها + نتیجه ارزیابی)
router.get("/jobs/:id/applicants/:applicationId", getApplicantDetail);

// دانلود رزومه
router.get("/jobs/:id/applicants/:applicationId/resume", downloadResume);

// دانلود فایلِ پاسخِ یک سؤالِ آپلود فایل
router.get(
  "/jobs/:id/applicants/:applicationId/answers/:questionId/file",
  downloadAnswerFile
);

// تغییر دستی وضعیت متقاضی
router.patch("/jobs/:id/applicants/:applicationId/status", updateApplicantStatus);

module.exports = router;
