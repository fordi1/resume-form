// ============================================================================
// کنترلر پنل کارفرما (بخش ۹ و ۱۰ مستند)
// ============================================================================
// کارفرما می‌تواند:
//   - لیست متقاضیان یک شغل را ببیند (پیش‌فرض: مرتب بر اساس بیشترین امتیاز)
//   - بر اساس امتیاز، وضعیت، مهارت، سابقه و تاریخ ثبت فیلتر کند
//   - رزومه متقاضی را دانلود کند
//   - همه‌ی پاسخ‌های فرم را ببیند
//   - وضعیت متقاضی را دستی تغییر دهد
// همه‌ی مسیرها با authGuard محافظت شده‌اند و مالکیت شغل بررسی می‌شود.
// ============================================================================
const path = require("path");
const fs = require("fs");
const prisma = require("../../config/prisma");
const { computeMaxScore } = require("../assessment/assessment.engine");

// وضعیت‌هایی که کارفرما می‌تواند دستی تنظیم کند
const MANUAL_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "ACCEPTED",
  "HIRED",
  "REJECTED",
];

// بررسی مالکیت شغل توسط کارفرما
async function getOwnedJob(jobId, employerId) {
  return prisma.jobPosition.findFirst({
    where: { id: jobId, employerId },
  });
}

// تشخیص خودکار «سؤال سابقه» بدون نیاز به کلید دستی.
// اولویت: ۱) کلید قدیمی experience_years (برای سازگاری با داده‌های قبلی)
//         ۲) یک سؤال عددی که متن آن به سابقه/تجربه/experience اشاره دارد
function isExperienceQuestion(question) {
  if (!question) return false;
  // سازگاری با نسخه قبلی که از fieldKey استفاده می‌کرد
  if (question.fieldKey === "experience_years") return true;
  // فقط سؤالات عددی می‌توانند «سابقه» باشند
  if (question.type !== "NUMBER") return false;
  const label = String(question.label || "").toLowerCase();
  // کلیدواژه‌های رایج برای سابقه کاری
  const keywords = ["سابقه", "تجربه", "experience", "years", "سال کار"];
  return keywords.some((kw) => label.includes(kw));
}

// خواندن مقدار عددیِ سابقه از پاسخ‌ها (به‌صورت خودکار سؤال سابقه را پیدا می‌کند)
function extractExperience(answers) {
  const expAnswer = answers.find((a) => isExperienceQuestion(a.question));
  if (!expAnswer || expAnswer.value == null) return null;
  const n = Number(expAnswer.value);
  return Number.isNaN(n) ? null : n;
}

// بررسی اینکه متقاضی یک مهارت مشخص را در پاسخ‌هایش دارد یا نه
function hasSkill(answers, skill) {
  const needle = String(skill).trim().toLowerCase();
  return answers.some((a) => {
    if (a.value == null) return false;
    return String(a.value).toLowerCase().includes(needle);
  });
}

// --------------------------------------------------------------------------
// لیست متقاضیان یک شغل + فیلترها
// GET /api/admin/jobs/:id/applicants
// پارامترهای کوئری (همه اختیاری):
//   minScore, maxScore   → فیلتر امتیاز (مثلاً minScore=80)
//   status               → فیلتر وضعیت (مثلاً REJECTED_AUTO یا UNDER_REVIEW)
//   skill                → فیلتر مهارت (مثلاً Docker)
//   minExperience        → حداقل سابقه (سال)
//   fromDate, toDate     → بازه تاریخ ثبت (ISO، مثل 2026-01-01)
//   sort                 → score_desc (پیش‌فرض) | score_asc | date_desc | date_asc
// --------------------------------------------------------------------------
async function listApplicants(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const {
      minScore,
      maxScore,
      status,
      category,
      skill,
      skills, // چند مهارت با ویرگول جدا شده (مثلاً: Docker,PostgreSQL)
      minExperience,
      fromDate,
      toDate,
      sort,
    } = req.query;

    // ---- فیلترهای سطح دیتابیس ----
    const where = { jobPositionId: job.id };

    // امتیاز
    if (minScore != null || maxScore != null) {
      where.finalScore = {};
      if (minScore != null) where.finalScore.gte = Number(minScore);
      if (maxScore != null) where.finalScore.lte = Number(maxScore);
    }

    // وضعیت
    if (status) where.status = status;

    // دسته‌بندی (EXCELLENT | VERY_GOOD | GOOD | AVERAGE | REJECTED)
    if (category) where.category = category;

    // بازه تاریخ ثبت
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    // ---- مرتب‌سازی (پیش‌فرض: بیشترین امتیاز) ----
    let orderBy = { finalScore: "desc" };
    if (sort === "score_asc") orderBy = { finalScore: "asc" };
    else if (sort === "date_desc") orderBy = { createdAt: "desc" };
    else if (sort === "date_asc") orderBy = { createdAt: "asc" };

    let applications = await prisma.application.findMany({
      where,
      orderBy,
      include: {
        applicant: true,
        result: true,
        answers: { include: { question: true } },
      },
    });

    // مهارت‌های تیک‌خورده‌ی هر متقاضی را از فیلد skills می‌خوانیم
    const parseSkills = (app) => {
      try {
        const arr = JSON.parse(app.skills || "[]");
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    };

    // ---- فیلترهای سطح برنامه (مهارت و سابقه) ----
    // فیلتر تک‌مهارتی (سازگاری قدیمی)
    if (skill) {
      applications = applications.filter((app) => parseSkills(app).includes(skill));
    }
    // فیلتر چندمهارتی — متقاضی باید همه‌ی مهارت‌های انتخاب‌شده را داشته باشد
    if (skills) {
      const wanted = String(skills)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (wanted.length > 0) {
        applications = applications.filter((app) => {
          const has = parseSkills(app);
          return wanted.every((w) => has.includes(w));
        });
      }
    }
    // فیلتر حداقل سابقه (از فیلد اختصاصی experienceYears)
    if (minExperience != null) {
      const minExp = Number(minExperience);
      applications = applications.filter(
        (app) => app.experienceYears != null && app.experienceYears >= minExp
      );
    }

    // ---- خروجی خلاصه برای لیست ----
    const list = applications.map((app) => ({
      applicationId: app.id,
      fullName: app.applicant.fullName,
      email: app.applicant.email,
      phone: app.applicant.phone,
      finalScore: app.finalScore,
      category: app.category,
      status: app.status,
      hasResume: Boolean(app.resumeFilePath),
      submittedAt: app.createdAt,
      experience: app.experienceYears,
      skills: parseSkills(app),
    }));

    // ---- مهارت‌های موردنیاز و حداقل سابقه‌ی شغل (برای فیلترها) ----
    let jobRequiredSkills = [];
    try {
      jobRequiredSkills = JSON.parse(job.requiredSkills || "[]");
    } catch (_) {
      jobRequiredSkills = [];
    }

    // ---- محاسبه‌ی سقف امتیاز کل فرم (برای نمایش در هدر ستون امتیاز) ----
    const questions = await prisma.question.findMany({
      where: { jobPositionId: job.id },
      select: { id: true, type: true },
    });
    const scoringRules = await prisma.scoringRule.findMany({
      where: { question: { jobPositionId: job.id } },
    });
    const maxPossibleScore = computeMaxScore(scoringRules, questions);

    return res.status(200).json({
      job: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        maxPossibleScore,
        requiredSkills: jobRequiredSkills,
        minExperience: job.minExperience,
      },
      count: list.length,
      applicants: list,
    });
  } catch (err) {
    console.error("listApplicants error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// مشاهده کامل یک متقاضی (پاسخ‌ها + نتیجه ارزیابی)
// GET /api/admin/jobs/:id/applicants/:applicationId
// --------------------------------------------------------------------------
async function getApplicantDetail(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const app = await prisma.application.findFirst({
      where: { id: req.params.applicationId, jobPositionId: job.id },
      include: {
        applicant: true,
        result: true,
        answers: {
          include: { question: true },
          orderBy: { question: { order: "asc" } },
        },
      },
    });
    if (!app) return res.status(404).json({ message: "متقاضی یافت نشد." });

    // پاسخ‌ها را همراه با متن سؤال آماده می‌کنیم
    const answers = app.answers.map((a) => {
      let value = a.value;
      // اگر پاسخ چندگزینه‌ای به صورت JSON است، به آرایه تبدیل کن
      if (a.question && a.question.type === "MULTI_CHOICE" && value) {
        try {
          value = JSON.parse(value);
        } catch (_) {
          /* همان رشته می‌ماند */
        }
      }
      return {
        questionId: a.questionId,
        label: a.question ? a.question.label : null,
        type: a.question ? a.question.type : null,
        value,
        earnedPoints: a.earnedPoints,
      };
    });

    // جزئیات محاسبه امتیاز (breakdown) را از رشته JSON به شیء برمی‌گردانیم
    let breakdown = null;
    if (app.result && app.result.breakdown) {
      try {
        breakdown = JSON.parse(app.result.breakdown);
      } catch (_) {
        breakdown = null;
      }
    }

    // مهارت‌های تیک‌خورده‌ی متقاضی
    let candidateSkills = [];
    try {
      candidateSkills = JSON.parse(app.skills || "[]");
    } catch (_) {
      candidateSkills = [];
    }

    return res.status(200).json({
      applicationId: app.id,
      applicant: app.applicant,
      status: app.status,
      finalScore: app.finalScore,
      category: app.category,
      rejectionReason: app.rejectionReason,
      experience: app.experienceYears,
      skills: candidateSkills,
      submittedAt: app.createdAt,
      resume: app.resumeFilePath
        ? { fileName: app.resumeFileName, available: true }
        : { available: false },
      answers,
      result: app.result
        ? {
            decision: app.result.decision,
            finalScore: app.result.finalScore,
            category: app.result.category,
            engineVersion: app.result.engineVersion,
            breakdown,
          }
        : null,
    });
  } catch (err) {
    console.error("getApplicantDetail error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// دانلود رزومه متقاضی
// GET /api/admin/jobs/:id/applicants/:applicationId/resume
// --------------------------------------------------------------------------
async function downloadResume(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const app = await prisma.application.findFirst({
      where: { id: req.params.applicationId, jobPositionId: job.id },
    });
    if (!app || !app.resumeFilePath) {
      return res.status(404).json({ message: "رزومه‌ای برای این متقاضی ثبت نشده است." });
    }

    // مسیر واقعی فایل روی دیسک (نسبت به ریشه پوشه backend)
    const absolutePath = path.join(__dirname, "..", "..", "..", app.resumeFilePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "فایل رزومه روی سرور یافت نشد." });
    }

    const downloadName = app.resumeFileName || "resume.pdf";
    return res.download(absolutePath, downloadName);
  } catch (err) {
    console.error("downloadResume error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// دانلود فایلِ پاسخِ یک سؤالِ آپلود فایل
// GET /api/admin/jobs/:id/applicants/:applicationId/answers/:questionId/file
// --------------------------------------------------------------------------
async function downloadAnswerFile(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    // پاسخِ همین سؤال برای همین درخواست را پیدا می‌کنیم
    const answer = await prisma.answer.findFirst({
      where: {
        questionId: req.params.questionId,
        application: {
          id: req.params.applicationId,
          jobPositionId: job.id,
        },
      },
    });

    if (!answer || !answer.value || !answer.value.startsWith("uploads/")) {
      return res.status(404).json({ message: "فایلی برای این پاسخ ثبت نشده است." });
    }

    const absolutePath = path.join(__dirname, "..", "..", "..", answer.value);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "فایل روی سرور یافت نشد." });
    }

    // نام فایل خروجی از روی نام ذخیره‌شده روی دیسک
    const downloadName = path.basename(answer.value);
    return res.download(absolutePath, downloadName);
  } catch (err) {
    console.error("downloadAnswerFile error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// تغییر دستی وضعیت متقاضی
// PATCH /api/admin/jobs/:id/applicants/:applicationId/status
// بدنه: { "status": "SHORTLISTED" }
// --------------------------------------------------------------------------
async function updateApplicantStatus(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const { status } = req.body;
    if (!status || !MANUAL_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `وضعیت نامعتبر است. مقادیر مجاز: ${MANUAL_STATUSES.join(", ")}`,
      });
    }

    const app = await prisma.application.findFirst({
      where: { id: req.params.applicationId, jobPositionId: job.id },
    });
    if (!app) return res.status(404).json({ message: "متقاضی یافت نشد." });

    const updated = await prisma.application.update({
      where: { id: app.id },
      data: { status },
    });

    return res.status(200).json({
      message: "وضعیت متقاضی به‌روزرسانی شد.",
      applicationId: updated.id,
      status: updated.status,
    });
  } catch (err) {
    console.error("updateApplicantStatus error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

module.exports = {
  listApplicants,
  getApplicantDetail,
  downloadResume,
  downloadAnswerFile,
  updateApplicantStatus,
};
