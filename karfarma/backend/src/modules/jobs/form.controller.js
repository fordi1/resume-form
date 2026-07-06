// ============================================================================
// کنترلر طراحی فرم استخدام و سؤالات (Form + Question)
// ============================================================================
// هر موقعیت شغلی یک فرم دارد. کارفرما سؤالات را به آن اضافه/ویرایش/حذف می‌کند.
// ترتیب سؤالات با فیلد order مشخص می‌شود (نیازی به Drag & Drop نیست).
// همه‌ی مسیرها فقط برای کارفرمای صاحب همان شغل هستند.
// ============================================================================
const prisma = require("../../config/prisma");

// انواع مجاز سؤال
const QUESTION_TYPES = [
  "SHORT_TEXT",   // متن کوتاه
  "LONG_TEXT",    // متن بلند
  "NUMBER",       // عدد
  "SINGLE_CHOICE",// انتخاب یک گزینه
  "MULTI_CHOICE", // انتخاب چند گزینه
  "BOOLEAN",      // بله / خیر
  "LINK",         // لینک
  "FILE_UPLOAD",  // آپلود فایل
];

// انواعی که به گزینه (options) نیاز دارند
const CHOICE_TYPES = ["SINGLE_CHOICE", "MULTI_CHOICE"];

// بررسی مالکیت شغل توسط کارفرما و برگرداندن شغل به همراه فرمش
async function getOwnedJob(jobId, employerId) {
  return prisma.jobPosition.findFirst({
    where: { id: jobId, employerId },
    include: { form: true },
  });
}

// options را همیشه به رشته JSON استاندارد تبدیل می‌کند
function normalizeOptions(options) {
  if (!options) return "[]";
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return JSON.stringify(parsed);
    } catch (_) {
      return "[]";
    }
  }
  if (Array.isArray(options)) {
    // هر گزینه را به شکل {value,label} استاندارد می‌کنیم
    const clean = options.map((o) => {
      if (typeof o === "string") return { value: o, label: o };
      return { value: o.value ?? o.label, label: o.label ?? o.value };
    });
    return JSON.stringify(clean);
  }
  return "[]";
}

// خروجی سؤال را آماده می‌کند (options را به آرایه برمی‌گرداند)
function presentQuestion(q) {
  let options = [];
  try {
    options = JSON.parse(q.options || "[]");
  } catch (_) {
    options = [];
  }
  return { ...q, options };
}

// --------------------------------------------------------------------------
// افزودن سؤال به فرم  —  POST /api/jobs/:id/questions
// --------------------------------------------------------------------------
async function addQuestion(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job || !job.form) {
      return res.status(404).json({ message: "شغل یا فرم آن یافت نشد." });
    }

    const { type, label, helpText, isRequired, order, options, fieldKey } = req.body;

    if (!type || !QUESTION_TYPES.includes(type)) {
      return res.status(400).json({
        message: `نوع سؤال نامعتبر است. مقادیر مجاز: ${QUESTION_TYPES.join(", ")}`,
      });
    }
    if (!label) {
      return res.status(400).json({ message: "متن سؤال (label) الزامی است." });
    }
    if (CHOICE_TYPES.includes(type)) {
      const parsed = JSON.parse(normalizeOptions(options));
      if (parsed.length === 0) {
        return res.status(400).json({ message: "برای سؤال گزینه‌ای، حداقل یک گزینه لازم است." });
      }
    }

    // اگر ترتیب مشخص نشده بود، آن را در انتهای فرم قرار بده
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.question.findFirst({
        where: { formId: job.form.id },
        orderBy: { order: "desc" },
      });
      finalOrder = last ? last.order + 1 : 0;
    }

    const question = await prisma.question.create({
      data: {
        formId: job.form.id,
        jobPositionId: job.id,
        type,
        label,
        helpText: helpText || null,
        isRequired: Boolean(isRequired),
        order: Number(finalOrder),
        options: normalizeOptions(options),
        fieldKey: fieldKey || null,
      },
    });

    return res.status(201).json({ message: "سؤال اضافه شد.", question: presentQuestion(question) });
  } catch (err) {
    console.error("addQuestion error:", err);
    return res.status(500).json({ message: "خطای سرور در افزودن سؤال." });
  }
}

// --------------------------------------------------------------------------
// ویرایش سؤال  —  PUT /api/jobs/:id/questions/:questionId
// --------------------------------------------------------------------------
async function updateQuestion(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }

    // سؤال باید متعلق به همین شغل باشد
    const existing = await prisma.question.findFirst({
      where: { id: req.params.questionId, jobPositionId: job.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "سؤال یافت نشد." });
    }

    const { type, label, helpText, isRequired, order, options, fieldKey } = req.body;

    if (type && !QUESTION_TYPES.includes(type)) {
      return res.status(400).json({
        message: `نوع سؤال نامعتبر است. مقادیر مجاز: ${QUESTION_TYPES.join(", ")}`,
      });
    }

    const data = {};
    if (type !== undefined) data.type = type;
    if (label !== undefined) data.label = label;
    if (helpText !== undefined) data.helpText = helpText;
    if (isRequired !== undefined) data.isRequired = Boolean(isRequired);
    if (order !== undefined) data.order = Number(order);
    if (options !== undefined) data.options = normalizeOptions(options);
    if (fieldKey !== undefined) data.fieldKey = fieldKey;

    const question = await prisma.question.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({ message: "سؤال ویرایش شد.", question: presentQuestion(question) });
  } catch (err) {
    console.error("updateQuestion error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// حذف سؤال  —  DELETE /api/jobs/:id/questions/:questionId
// --------------------------------------------------------------------------
async function deleteQuestion(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }
    const existing = await prisma.question.findFirst({
      where: { id: req.params.questionId, jobPositionId: job.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "سؤال یافت نشد." });
    }
    await prisma.question.delete({ where: { id: existing.id } });
    return res.status(200).json({ message: "سؤال حذف شد." });
  } catch (err) {
    console.error("deleteQuestion error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// تغییر ترتیب سؤالات  —  PUT /api/jobs/:id/questions/reorder
// بدنه: { "order": ["questionId1", "questionId2", ...] }
// ترتیب آرایه = ترتیب نمایش سؤالات
// --------------------------------------------------------------------------
async function reorderQuestions(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }

    const { order } = req.body; // آرایه‌ای از شناسه سؤال‌ها
    if (!Array.isArray(order)) {
      return res.status(400).json({ message: "فیلد order باید آرایه‌ای از شناسه‌ها باشد." });
    }

    // همه را در یک تراکنش به‌روزرسانی می‌کنیم
    await prisma.$transaction(
      order.map((questionId, index) =>
        prisma.question.updateMany({
          where: { id: questionId, jobPositionId: job.id },
          data: { order: index },
        })
      )
    );

    const questions = await prisma.question.findMany({
      where: { jobPositionId: job.id },
      orderBy: { order: "asc" },
    });

    return res.status(200).json({
      message: "ترتیب سؤالات به‌روزرسانی شد.",
      questions: questions.map(presentQuestion),
    });
  } catch (err) {
    console.error("reorderQuestions error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// مشاهده فرم و سؤالات یک شغل  —  GET /api/jobs/:id/form
// --------------------------------------------------------------------------
async function getForm(req, res) {
  try {
    const job = await prisma.jobPosition.findFirst({
      where: { id: req.params.id, employerId: req.employer.id },
      include: {
        form: true,
        questions: { orderBy: { order: "asc" } },
      },
    });
    if (!job || !job.form) {
      return res.status(404).json({ message: "فرم یافت نشد." });
    }
    return res.status(200).json({
      form: job.form,
      questions: job.questions.map(presentQuestion),
    });
  } catch (err) {
    console.error("getForm error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

module.exports = {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getForm,
};
