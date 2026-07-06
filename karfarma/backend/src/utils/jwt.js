// ============================================================================
// ابزار کار با توکن JWT
// ============================================================================
// این فایل دو کار ساده انجام می‌دهد:
//   1) ساخت توکن هنگام ورود/ثبت‌نام
//   2) بررسی و باز کردن توکن هنگام درخواست‌های محافظت‌شده
// کلید امنیتی (JWT_SECRET) از فایل .env خوانده می‌شود.
// ============================================================================
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * ساخت توکن برای یک کارفرما.
 * @param {object} payload اطلاعاتی که داخل توکن قرار می‌گیرد (مثل id و email)
 * @returns {string} توکن امضاشده
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * بررسی توکن و برگرداندن محتوای آن.
 * اگر توکن نامعتبر یا منقضی باشد، خطا پرتاب می‌کند.
 * @param {string} token
 * @returns {object} محتوای توکن
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
