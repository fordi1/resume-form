// ============================================================================
// مسیرهای (Routes) موقعیت شغلی و فرم استخدام
// ============================================================================
// همه‌ی مسیرها با authGuard محافظت شده‌اند (فقط کارفرمای واردشده).
// ============================================================================
const express = require("express");
const router = express.Router();

const authGuard = require("../../middlewares/auth.middleware");
const {
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
  toggleJob,
} = require("./jobs.controller");
const {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getForm,
} = require("./form.controller");
const {
  addScoringRule,
  listScoringRules,
  updateScoringRule,
  deleteScoringRule,
  addRejectionRule,
  listRejectionRules,
  updateRejectionRule,
  deleteRejectionRule,
} = require("./rules.controller");

// از اینجا به بعد همه‌ی مسیرها نیاز به توکن دارند
router.use(authGuard);

// -------- موقعیت شغلی --------
router.post("/", createJob);            // ساخت شغل
router.get("/", listJobs);              // لیست شغل‌های من
router.get("/:id", getJob);             // مشاهده یک شغل (+ فرم و سؤالات)
router.put("/:id", updateJob);          // ویرایش شغل
router.delete("/:id", deleteJob);       // حذف شغل
router.patch("/:id/toggle", toggleJob); // فعال/غیرفعال کردن

// -------- فرم و سؤالات --------
router.get("/:id/form", getForm);                              // مشاهده فرم و سؤالات
router.post("/:id/questions", addQuestion);                    // افزودن سؤال
router.put("/:id/questions/reorder", reorderQuestions);        // تغییر ترتیب سؤالات
router.put("/:id/questions/:questionId", updateQuestion);      // ویرایش سؤال
router.delete("/:id/questions/:questionId", deleteQuestion);   // حذف سؤال

// -------- قوانین امتیازدهی (وابسته به یک سؤال) --------
router.get("/:id/questions/:questionId/scoring-rules", listScoringRules);   // لیست قوانین امتیاز یک سؤال
router.post("/:id/questions/:questionId/scoring-rules", addScoringRule);    // افزودن قانون امتیاز
router.put("/:id/scoring-rules/:ruleId", updateScoringRule);               // ویرایش قانون امتیاز
router.delete("/:id/scoring-rules/:ruleId", deleteScoringRule);            // حذف قانون امتیاز

// -------- قوانین رد خودکار (وابسته به شغل) --------
router.get("/:id/rejection-rules", listRejectionRules);        // لیست قوانین رد
router.post("/:id/rejection-rules", addRejectionRule);         // افزودن قانون رد
router.put("/:id/rejection-rules/:ruleId", updateRejectionRule);   // ویرایش قانون رد
router.delete("/:id/rejection-rules/:ruleId", deleteRejectionRule); // حذف قانون رد

module.exports = router;
