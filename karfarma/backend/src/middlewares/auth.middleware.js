// ============================================================================
// میدل‌ور احراز هویت
// ============================================================================
// این میدل‌ور جلوی مسیرهایی که فقط کارفرمای وارد‌شده باید ببیند را می‌گیرد.
// انتظار دارد در هدر درخواست، توکن به این شکل بیاید:
//   Authorization: Bearer <token>
// اگر توکن معتبر بود، اطلاعات کارفرما را در req.employer می‌گذارد.
// ============================================================================
const { verifyToken } = require("../utils/jwt");

function authGuard(req, res, next) {
  const header = req.headers.authorization || "";

  // هدر باید با "Bearer " شروع شود
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "توکن ارسال نشده است. لطفاً وارد شوید." });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    // اطلاعات کارفرما را برای مسیرهای بعدی نگه می‌داریم
    req.employer = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: "توکن نامعتبر یا منقضی شده است." });
  }
}

module.exports = authGuard;
