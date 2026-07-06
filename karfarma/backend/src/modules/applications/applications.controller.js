// ============================================================================
// کنترلر ثبت درخواست متقاضیان (Application)
// ============================================================================
// این بخش عمومی است: متقاضی بدون ثبت‌نام و بدون توکن، از طریق لینک اختصاصی
// (slug) فرم را می‌بیند و درخواست خود را ثبت می‌کند.
//
// جریان کار در ثبت درخواست:
//   1) پیدا کردن شغل فعال از روی slug
//   2) ساخت متقاضی (Applicant)
//   3) ساخت درخواست (Application) + ذخیره مسیر فایل رزومه
//   4) ذخیره پاسخ‌ها (Answer)
//   5) صدا زدن ماژول مستقل Assessment Engine برای ارزیابی
//   6) برگرداندن نتیجه
// ============================================================================
const prisma = require("../../config/prisma");
const { runAssessment } = require("../assessment/assessment.engine");

// آماده‌سازی سؤال برای نمایش عمومی (بدون قوانین امتیاز/رد)
function presentPublicQuestion(q) {
  let options = [];
  try {
    options = JSON.parse(q.options || "[]");
  } catch (_) {
    options = [];
  }
  return {
    id: q.id,
    type: q.type,
    label: q.label,
    helpText: q.helpText,
    isRequired: q.isRequired,
    order: q.order,
    options,
  };
}

// --------------------------------------------------------------------------
// نمایش فرم عمومی برای متقاضی  —  GET /api/applications/form/:slug
// (بدون توکن) — فقط اطلاعات لازم برای پر کردن فرم برگردانده می‌شود.
// --------------------------------------------------------------------------
async function getPublicForm(req, res) {
  try {
    const job = await prisma.jobPosition.findUnique({
      where: { slug: req.params.slug },
      include: {
        form: true,
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!job || !job.isActive) {
      return res.status(404).json({ message: "این موقعیت شغلی فعال نیست یا وجود ندارد." });
    }

    let requiredSkills = [];
    try {
      requiredSkills = JSON.parse(job.requiredSkills || "[]");
    } catch (_) {
      requiredSkills = [];
    }

    return res.status(200).json({
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        requiredSkills,
        minExperience: job.minExperience,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        location: job.location,
        employmentType: job.employmentType,
        slug: job.slug,
      },
      form: job.form ? { title: job.form.title, description: job.form.description } : null,
      questions: job.questions.map(presentPublicQuestion),
    });
  } catch (err) {
    console.error("getPublicForm error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// ثبت درخواست استخدام  —  POST /api/applications/apply/:slug
// (بدون توکن) — به صورت multipart/form-data:
//   - فیلدهای متنی: fullName, email, phone
//   - answers: یک رشته JSON مثل: [{"questionId":"...","value":"5"}]
//   - resume: فایل PDF (اختیاری در سطح فنی، ولی معمولاً الزامی)
// --------------------------------------------------------------------------
async function submitApplication(req, res) {
  try {
    const { slug } = req.params;

    // ۱) پیدا کردن شغل فعال
    const job = await prisma.jobPosition.findUnique({
      where: { slug },
      include: { questions: true },
    });

    if (!job || !job.isActive) {
      return res.status(404).json({ message: "این موقعیت شغلی فعال نیست یا وجود ندارد." });
    }

    // ۲) خواندن اطلاعات متقاضی
    const { fullName, email, phone } = req.body;
    if (!fullName) {
      return res.status(400).json({ message: "نام و نام خانوادگی الزامی است." });
    }

    // سابقه کاری (سال)
    const experienceYears =
      req.body.experienceYears != null && req.body.experienceYears !== ""
        ? Number(req.body.experienceYears)
        : null;

    // مهارت‌های تیک‌خورده — ممکن است به صورت رشته JSON بیاید
    let skills = [];
    if (req.body.skills) {
      try {
        skills =
          typeof req.body.skills === "string"
            ? JSON.parse(req.body.skills)
            : req.body.skills;
      } catch (_) {
        skills = [];
      }
    }
    if (!Array.isArray(skills)) skills = [];
    // فقط مهارت‌هایی که واقعاً جزو مهارت‌های موردنیاز شغل هستند نگه داشته می‌شوند
    let jobSkills = [];
    try {
      jobSkills = JSON.parse(job.requiredSkills || "[]");
    } catch (_) {
      jobSkills = [];
    }
    const cleanSkills = skills.filter((s) => jobSkills.includes(s));

    // ۳) خواندن و اعتبارسنجی پاسخ‌ها
    // answers ممکن است به صورت رشته JSON بیاید (چون فرم multipart است)
    let answers = [];
    if (req.body.answers) {
      try {
        answers =
          typeof req.body.answers === "string"
            ? JSON.parse(req.body.answers)
            : req.body.answers;
      } catch (_) {
        return res.status(400).json({ message: "قالب answers نامعتبر است (باید JSON باشد)." });
      }
    }
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers باید یک آرایه باشد." });
    }

    // ---- فایل‌های آپلودشده (رزومه + فایل‌های سؤالات) ----
    const files = req.files || [];
    const resumeFile = files.find((f) => f.fieldname === "resume");
    // نگاشت questionId → فایلِ همان سؤال (فیلدهای file_<questionId>)
    const questionFileByQid = {};
    for (const f of files) {
      if (f.fieldname.startsWith("file_")) {
        const qid = f.fieldname.slice(5);
        questionFileByQid[qid] = f;
      }
    }

    // فقط پاسخ‌هایی که به سؤالات همین شغل مربوط‌اند نگه داشته می‌شوند
    const validQuestionIds = new Set(job.questions.map((q) => q.id));
    const cleanAnswers = answers
      .filter((a) => a && validQuestionIds.has(a.questionId))
      .map((a) => ({
        questionId: a.questionId,
        // مقدار را همیشه به رشته تبدیل می‌کنیم؛ آرایه‌ها به JSON
        value:
          a.value == null
            ? null
            : Array.isArray(a.value)
            ? JSON.stringify(a.value)
            : String(a.value),
      }));

    // برای سؤالات آپلود فایل، مقدار پاسخ را به مسیر فایل ذخیره‌شده تغییر می‌دهیم
    for (const [qid, f] of Object.entries(questionFileByQid)) {
      if (!validQuestionIds.has(qid)) continue;
      const filePath = `uploads/${f.filename}`;
      const existing = cleanAnswers.find((a) => a.questionId === qid);
      if (existing) existing.value = filePath;
      else cleanAnswers.push({ questionId: qid, value: filePath });
    }

    // بررسی سؤالات الزامی
    const requiredIds = job.questions.filter((q) => q.isRequired).map((q) => q.id);
    const answeredIds = new Set(cleanAnswers.map((a) => a.questionId));
    const missing = requiredIds.filter((id) => !answeredIds.has(id));
    if (missing.length > 0) {
      return res.status(400).json({
        message: "به همه‌ی سؤالات الزامی پاسخ دهید.",
        missingQuestionIds: missing,
      });
    }

    // ۴) مسیر فایل رزومه (اگر آپلود شده باشد)
    const resumeFilePath = resumeFile ? `uploads/${resumeFile.filename}` : null;
    const resumeFileName = resumeFile ? resumeFile.originalname : null;

    // ۵) ساخت متقاضی + درخواست + پاسخ‌ها در یک تراکنش
    const applicant = await prisma.applicant.create({
      data: {
        fullName,
        email: email || null,
        phone: phone || null,
      },
    });

    const application = await prisma.application.create({
      data: {
        applicantId: applicant.id,
        jobPositionId: job.id,
        resumeFilePath,
        resumeFileName,
        experienceYears,
        skills: JSON.stringify(cleanSkills),
        status: "PENDING",
        answers: {
          create: cleanAnswers.map((a) => ({
            questionId: a.questionId,
            value: a.value,
          })),
        },
      },
    });

    // ۶) اجرای ماژول مستقل ارزیابی
    const result = await runAssessment(application.id);

    return res.status(201).json({
      message: "درخواست شما ثبت شد.",
      applicationId: application.id,
      result: {
        decision: result.decision,
        finalScore: result.finalScore,
        category: result.category,
        rejectionReason: result.rejectionReason,
      },
    });
  } catch (err) {
    console.error("submitApplication error:", err);
    return res.status(500).json({ message: "خطای سرور در ثبت درخواست." });
  }
}

module.exports = { getPublicForm, submitApplication };
