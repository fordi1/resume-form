// ============================================================================
// Assessment Engine — ماژول مستقل ارزیابی و امتیازدهی (نسخه اول: Rule Engine)
// ============================================================================
// این ماژول تنها جایی است که «منطق امتیازدهی» را می‌داند.
// سایر بخش‌های پروژه فقط تابع runAssessment(applicationId) را صدا می‌زنند و
// نتیجه را می‌گیرند؛ آن‌ها نمی‌دانند امتیاز چطور حساب می‌شود.
//
// به همین دلیل در آینده می‌توان این فایل را با یک موتور مبتنی بر هوش مصنوعی
// جایگزین کرد، بدون اینکه ماژول متقاضیان یا پنل کارفرما تغییر کند.
//
// ساختار فایل:
//   1) توابع کمکی خالص (pure) برای تفسیر مقدار و اجرای شرط‌ها
//   2) تابع خالص assess(...) که فقط داده می‌گیرد و نتیجه می‌دهد (بدون دیتابیس)
//   3) تابع runAssessment(applicationId) که داده را از دیتابیس می‌خواند،
//      assess را صدا می‌زند و نتیجه را ذخیره می‌کند.
// ============================================================================
const prisma = require("../../config/prisma");

// نسخه موتور فعلی — در آینده مثلاً "ai-engine-v1"
const ENGINE_VERSION = "rule-engine-v1";

// --------------------------------------------------------------------------
// دسته‌بندی چارکی بر اساس «درصد امتیاز» (نسبت امتیاز کسب‌شده به حداکثر ممکن)
// این‌ها تنظیمات موتور هستند، نه امتیاز قوانین. امتیاز خودِ قوانین همیشه از
// دیتابیس خوانده می‌شود و هیچ‌جای کد ثابت نیست.
//   ۰ تا ۲۵٪        → متوسط    (AVERAGE)
//   ۲۵٫۰۱ تا ۵۰٪    → خوب      (GOOD)
//   ۵۰٫۰۱ تا ۷۵٪    → بسیار خوب (VERY_GOOD)
//   ۷۵٫۰۱ تا ۱۰۰٪   → عالی     (EXCELLENT)
// --------------------------------------------------------------------------
function categorizeByPercentage(percentage) {
  if (percentage > 75) return "EXCELLENT";
  if (percentage > 50) return "VERY_GOOD";
  if (percentage > 25) return "GOOD";
  return "AVERAGE";
}

// ==========================================================================
// 1) توابع کمکی خالص
// ==========================================================================

/**
 * مقدار پاسخ متقاضی را بر اساس نوع سؤال به شکل قابل‌مقایسه تبدیل می‌کند.
 * @param {string} type نوع سؤال (NUMBER, BOOLEAN, MULTI_CHOICE, ...)
 * @param {string|null} rawValue مقدار خام ذخیره‌شده در Answer.value
 * @returns {{ number:number|null, bool:boolean|null, text:string, list:string[] }}
 */
// تبدیل ارقام فارسی/عربی به لاتین (مثلاً ۱۲۳ → 123)
function toLatinDigits(str) {
  return String(str)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

// تبدیل یک مقدار به عدد؛ ارقام فارسی و جداکننده‌های سه‌رقمی را هم می‌فهمد.
// اگر عدد معتبر نبود، null برمی‌گرداند.
function parseNumber(value) {
  if (value == null) return null;
  // ارقام فارسی → لاتین، حذف ویرگول/فاصله جداکننده
  const normalized = toLatinDigits(value).replace(/[,\s]/g, "").trim();
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

function interpretAnswer(type, rawValue) {
  const result = { number: null, bool: null, text: "", list: [] };
  if (rawValue == null) return result;

  const raw = String(rawValue).trim();
  result.text = raw;

  // عدد — با پشتیبانی از ارقام فارسی و جداکننده سه‌رقمی
  result.number = parseNumber(raw);

  // بولین
  if (raw.toLowerCase() === "true") result.bool = true;
  else if (raw.toLowerCase() === "false") result.bool = false;

  // لیست (برای MULTI_CHOICE که به صورت JSON آرایه‌ای ذخیره شده)
  if (type === "MULTI_CHOICE") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        result.list = parsed.map((x) => String(x));
      }
    } catch (_) {
      // اگر JSON نبود، خودِ متن را یک آیتم در نظر بگیر
      result.list = raw ? [raw] : [];
    }
  } else {
    result.list = raw ? [raw] : [];
  }

  return result;
}

/**
 * مقایسه دو متن به صورت غیرحساس به حروف بزرگ/کوچک و فاصله.
 */
function textEquals(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * اجرای یک شرط روی پاسخ متقاضی.
 * @param {string} operator عملگر قانون
 * @param {object} answer خروجی interpretAnswer
 * @param {string|null} ruleValue مقدار مرجع قانون (رشته)
 * @returns {boolean} آیا شرط برقرار است؟
 */
function evaluateCondition(operator, answer, ruleValue) {
  const rv = ruleValue == null ? "" : String(ruleValue).trim();
  // مقدار عددی مرجع — با پشتیبانی از ارقام فارسی و جداکننده سه‌رقمی
  const rvNumber = parseNumber(rv);

  switch (operator) {
    case "EQUALS":
      return textEquals(answer.text, rv);

    case "NOT_EQUALS":
      return !textEquals(answer.text, rv);

    case "CONTAINS":
      // اگر پاسخ چندگزینه‌ای است، بررسی می‌کنیم rv در لیست باشد؛
      // در غیر این صورت بررسی می‌کنیم متن شامل rv باشد.
      if (answer.list.length > 1) {
        return answer.list.some((item) => textEquals(item, rv));
      }
      return answer.text.toLowerCase().includes(rv.toLowerCase());

    case "IN": {
      // rv باید یک آرایه JSON باشد مثل ["docker","k8s"]
      let options = [];
      try {
        options = JSON.parse(rv);
      } catch (_) {
        options = rv.split(",").map((x) => x.trim());
      }
      return options.some((opt) => textEquals(answer.text, opt));
    }

    case "GREATER_THAN":
      return answer.number != null && rvNumber != null && answer.number > rvNumber;

    case "GREATER_OR_EQUAL":
      return answer.number != null && rvNumber != null && answer.number >= rvNumber;

    case "LESS_THAN":
      return answer.number != null && rvNumber != null && answer.number < rvNumber;

    case "LESS_OR_EQUAL":
      return answer.number != null && rvNumber != null && answer.number <= rvNumber;

    case "IS_TRUE":
      return answer.bool === true;

    case "IS_FALSE":
      return answer.bool === false;

    default:
      // عملگر ناشناخته → شرط برقرار نیست
      return false;
  }
}

/**
 * حداکثر امتیاز ممکن فرم.
 * برای «هر سؤال» (بدون توجه به نوع آن) بیشترین امتیازِ ممکن آن سؤال پیدا می‌شود:
 *   - سؤال چندگزینه‌ای/بله‌خیر → بالاترین امتیاز میان گزینه‌ها (Math.max)
 *   - سؤال متنی/عددی/تشریحی    → همان امتیازی که کارفرما تعیین کرده
 *     (اگر چند شرط داشته باشد، باز هم بیشترین امتیاز لحاظ می‌شود)
 * سپس سقفِ همه‌ی سؤال‌ها با هم جمع می‌شود:
 *   maxPossibleScore = مجموعِ بیشترین امتیازِ تک‌تک سؤال‌ها
 *
 * @param {Array} scoringRules قوانین امتیازدهی (هرکدام questionId و points دارند)
 * @param {Array} questions سؤالات (اختیاری؛ برای سازگاری امضای تابع)
 * @returns {number}
 */
function computeMaxScore(scoringRules, questions) {
  // بیشترین امتیازِ مثبتِ هر سؤال را نگه می‌داریم
  const maxByQuestion = {};
  for (const rule of scoringRules) {
    if (rule.isActive === false) continue;
    const p = rule.points || 0;
    if (p <= 0) continue;
    const prev = maxByQuestion[rule.questionId] || 0;
    if (p > prev) maxByQuestion[rule.questionId] = p;
  }

  // مجموعِ بیشترین امتیازِ تک‌تک سؤال‌ها
  return Object.values(maxByQuestion).reduce((sum, m) => sum + m, 0);
}

// ==========================================================================
// 2) تابع خالص assess — بدون دیتابیس، فقط داده می‌گیرد و نتیجه می‌دهد
// ==========================================================================

/**
 * محاسبه‌ی نتیجه ارزیابی از روی پاسخ‌ها و قوانین.
 *
 * @param {object} input
 * @param {Array} input.questions  سؤالات شغل (برای دانستن نوع هر سؤال)
 * @param {Array} input.answers    پاسخ‌های متقاضی: [{questionId, value}]
 * @param {Array} input.scoringRules   قوانین امتیازدهی فعال
 * @param {Array} input.rejectionRules قوانین رد خودکار فعال
 *
 * @returns {{
 *   decision: string,        // "REJECTED_AUTO" یا "SCORED"
 *   finalScore: number,
 *   category: string,
 *   rejectionReason: string|null,
 *   breakdown: object,       // جزئیات کامل برای شفافیت
 *   answerPoints: object     // امتیاز هر پاسخ: { questionId: points }
 * }}
 */
function assess({ questions, answers, scoringRules, rejectionRules, builtIn }) {
  // نگاشت questionId → نوع سؤال، برای تفسیر درست پاسخ
  const typeByQuestion = {};
  for (const q of questions) {
    typeByQuestion[q.id] = q.type;
  }

  // نگاشت questionId → پاسخِ تفسیرشده
  const answerByQuestion = {};
  for (const a of answers) {
    const type = typeByQuestion[a.questionId] || "SHORT_TEXT";
    answerByQuestion[a.questionId] = interpretAnswer(type, a.value);
  }

  // ---------------------------------------------------------------
  // مرحله ۰: قوانین رد داخلیِ فرم (سابقه و مهارت‌های موردنیاز)
  // این‌ها بالاترین اولویت را دارند و مستقل از قوانین سفارشیِ کارفرما هستند.
  // ---------------------------------------------------------------
  const bi = builtIn || {};
  const minExperience = bi.minExperience != null ? Number(bi.minExperience) : null;
  const candidateExperience =
    bi.candidateExperience != null ? Number(bi.candidateExperience) : null;
  const requiredSkills = Array.isArray(bi.requiredSkills) ? bi.requiredSkills : [];
  const candidateSkills = Array.isArray(bi.candidateSkills) ? bi.candidateSkills : [];

  // ۱) سابقه‌ی کمتر از حداقل موردنیاز → رد
  if (minExperience != null && (candidateExperience ?? 0) < minExperience) {
    return {
      decision: "REJECTED_AUTO",
      finalScore: 0,
      category: "REJECTED",
      rejectionReason: `سابقه‌ی کاری کمتر از حداقل موردنیاز (${minExperience} سال) است.`,
      breakdown: {
        engineVersion: ENGINE_VERSION,
        rejectedBy: { type: "MIN_EXPERIENCE", required: minExperience, candidate: candidateExperience },
        checkedRejections: [],
        scoring: [],
      },
      answerPoints: {},
    };
  }

  // ۲) نداشتن هر یک از مهارت‌های موردنیاز → رد
  if (requiredSkills.length > 0) {
    const missingSkills = requiredSkills.filter((s) => !candidateSkills.includes(s));
    if (missingSkills.length > 0) {
      return {
        decision: "REJECTED_AUTO",
        finalScore: 0,
        category: "REJECTED",
        rejectionReason: `نداشتن مهارت‌های الزامی: ${missingSkills.join("، ")}`,
        breakdown: {
          engineVersion: ENGINE_VERSION,
          rejectedBy: { type: "MISSING_SKILLS", missing: missingSkills },
          checkedRejections: [],
          scoring: [],
        },
        answerPoints: {},
      };
    }
  }

  // ---------------------------------------------------------------
  // مرحله ۱: بررسی قوانین رد خودکارِ سفارشی
  // اگر حتی یک قانون رد برقرار شود، همان‌جا کار تمام می‌شود.
  // ---------------------------------------------------------------
  const checkedRejections = [];
  for (const rule of rejectionRules) {
    if (rule.isActive === false) continue;

    // قانون رد می‌تواند به یک سؤال خاص وابسته باشد
    const answer = rule.questionId
      ? answerByQuestion[rule.questionId] || interpretAnswer("SHORT_TEXT", null)
      : interpretAnswer("SHORT_TEXT", null);

    const matched = rule.questionId
      ? evaluateCondition(rule.operator, answer, rule.value)
      : false;

    checkedRejections.push({
      ruleId: rule.id,
      questionId: rule.questionId || null,
      operator: rule.operator,
      value: rule.value,
      matched,
      reason: rule.reason || null,
    });

    if (matched) {
      // متقاضی رد شد
      return {
        decision: "REJECTED_AUTO",
        finalScore: 0,
        category: "REJECTED",
        rejectionReason: rule.reason || "عدم احراز یکی از شرایط الزامی.",
        breakdown: {
          engineVersion: ENGINE_VERSION,
          rejectedBy: {
            ruleId: rule.id,
            questionId: rule.questionId || null,
            operator: rule.operator,
            value: rule.value,
            reason: rule.reason || null,
          },
          checkedRejections,
          scoring: [],
        },
        answerPoints: {},
      };
    }
  }

  // ---------------------------------------------------------------
  // مرحله ۲: محاسبه امتیاز
  // ---------------------------------------------------------------
  let finalScore = 0;
  const scoringDetails = [];
  const answerPoints = {}; // مجموع امتیاز هر سؤال

  for (const rule of scoringRules) {
    if (rule.isActive === false) continue;

    const answer =
      answerByQuestion[rule.questionId] || interpretAnswer("SHORT_TEXT", null);
    const matched = evaluateCondition(rule.operator, answer, rule.value);
    const points = matched ? rule.points || 0 : 0;

    if (matched) {
      finalScore += points;
      answerPoints[rule.questionId] = (answerPoints[rule.questionId] || 0) + points;
    }

    scoringDetails.push({
      ruleId: rule.id,
      questionId: rule.questionId,
      operator: rule.operator,
      value: rule.value,
      matched,
      points,
      label: rule.label || null,
    });
  }

  // درصد امتیاز = نسبت امتیاز کسب‌شده به حداکثر امتیاز ممکن (۰ تا ۱۰۰)
  const maxPossibleScore = computeMaxScore(scoringRules, questions);
  const scorePercentage =
    maxPossibleScore > 0 ? (finalScore / maxPossibleScore) * 100 : 0;
  const category = categorizeByPercentage(scorePercentage);

  return {
    decision: "SCORED",
    finalScore,
    category,
    rejectionReason: null,
    breakdown: {
      engineVersion: ENGINE_VERSION,
      checkedRejections,
      scoring: scoringDetails,
      finalScore,
      maxPossibleScore,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      category,
    },
    answerPoints,
  };
}

// ==========================================================================
// 3) runAssessment — می‌خواند از دیتابیس، assess را صدا می‌زند، ذخیره می‌کند
// ==========================================================================

/**
 * اجرای کامل ارزیابی برای یک درخواست ثبت‌شده.
 * داده‌های لازم را از دیتابیس می‌خواند، نتیجه را حساب و ذخیره می‌کند.
 *
 * @param {string} applicationId
 * @returns {Promise<object>} رکورد AssessmentResult ذخیره‌شده
 */
async function runAssessment(applicationId) {
  // ۱) خواندن درخواست همراه با شغل، سؤالات و پاسخ‌ها
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      answers: true,
      jobPosition: {
        include: {
          questions: true,
          rejectionRules: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error("درخواست یافت نشد.");
  }

  const questions = application.jobPosition.questions;
  const rejectionRules = application.jobPosition.rejectionRules;

  // ۲) قوانین امتیازدهیِ همه‌ی سؤالات این شغل
  const scoringRules = await prisma.scoringRule.findMany({
    where: { question: { jobPositionId: application.jobPositionId } },
  });

  // داده‌های داخلی فرم (سابقه و مهارت‌ها) برای قوانین رد داخلی
  let requiredSkills = [];
  try {
    requiredSkills = JSON.parse(application.jobPosition.requiredSkills || "[]");
  } catch (_) {
    requiredSkills = [];
  }
  let candidateSkills = [];
  try {
    candidateSkills = JSON.parse(application.skills || "[]");
  } catch (_) {
    candidateSkills = [];
  }

  // ۳) محاسبه با تابع خالص
  const output = assess({
    questions,
    answers: application.answers,
    scoringRules,
    rejectionRules,
    builtIn: {
      minExperience: application.jobPosition.minExperience,
      candidateExperience: application.experienceYears,
      requiredSkills,
      candidateSkills,
    },
  });

  // ۴) ذخیره امتیاز هر پاسخ (earnedPoints)
  const answerUpdates = application.answers.map((a) =>
    prisma.answer.update({
      where: { id: a.id },
      data: { earnedPoints: output.answerPoints[a.questionId] || 0 },
    })
  );

  // ۵) ساخت/به‌روزرسانی رکورد نتیجه ارزیابی + به‌روزرسانی وضعیت درخواست
  const newStatus = output.decision === "REJECTED_AUTO" ? "REJECTED_AUTO" : "UNDER_REVIEW";

  const [result] = await prisma.$transaction([
    prisma.assessmentResult.upsert({
      where: { applicationId },
      create: {
        applicationId,
        decision: output.decision,
        finalScore: output.finalScore,
        category: output.category,
        rejectionReason: output.rejectionReason,
        breakdown: JSON.stringify(output.breakdown),
        engineVersion: ENGINE_VERSION,
      },
      update: {
        decision: output.decision,
        finalScore: output.finalScore,
        category: output.category,
        rejectionReason: output.rejectionReason,
        breakdown: JSON.stringify(output.breakdown),
        engineVersion: ENGINE_VERSION,
      },
    }),
    // امتیاز و دسته‌بندی را روی خود درخواست هم نگه می‌داریم تا فیلتر/جستجو ساده باشد
    prisma.application.update({
      where: { id: applicationId },
      data: {
        finalScore: output.finalScore,
        category: output.category,
        status: newStatus,
        rejectionReason: output.rejectionReason,
        scoreBreakdown: JSON.stringify(output.breakdown),
      },
    }),
    ...answerUpdates,
  ]);

  return result;
}

module.exports = {
  ENGINE_VERSION,
  interpretAnswer,
  evaluateCondition,
  computeMaxScore,
  categorizeByPercentage,
  assess,
  runAssessment,
};
