// ============================================================================
// مسیرهای (Routes) احراز هویت کارفرما
// ============================================================================
// هر مسیر به یک تابع در کنترلر وصل می‌شود.
// مسیر /me با میدل‌ور authGuard محافظت شده است.
// ============================================================================
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");
const authGuard = require("../../middlewares/auth.middleware");

// مسیرهای عمومی (نیازی به توکن ندارند)
router.post("/register", register); // ثبت‌نام
router.post("/login", login);       // ورود
router.post("/logout", logout);     // خروج
router.post("/forgot-password", forgotPassword); // درخواست بازیابی رمز
router.post("/reset-password", resetPassword);   // تنظیم رمز جدید با توکن

// مسیر محافظت‌شده (نیاز به توکن دارد)
router.get("/me", authGuard, me);   // پروفایل کارفرمای واردشده

module.exports = router;
