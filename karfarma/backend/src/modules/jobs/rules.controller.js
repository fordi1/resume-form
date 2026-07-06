// ============================================================================
// کنترلر مدیریت قوانین (ScoringRule + RejectionRule)
// ============================================================================
// کارفرما برای هر سؤال، قوانین امتیازدهی و برای هر شغل، قوانین رد خودکار تعریف می‌کند.
// این قوانین توسط ماژول Assessment Engine خوانده و اجرا می‌شوند.
// همه‌ی مسیرها فقط برای کارفرمای صاحب همان شغل هستند (بررسی مالکیت).
// ============================================================================
const prisma = require("../../config/prisma");

// عملگرهای مجاز (باید با موتور ارزیابی هماهنگ باشند)
const OPERATORS = [
  "EQUALS",
  "NOT_EQUALS",
  "CONTAINS",
  "IN",
  "GREATER_THAN",
  "GREATER_OR_EQUAL",
  "LESS_THAN",
  "LESS_OR_EQUAL",
  "IS_TRUE",
  "IS_FALSE",
];

// بررسی مالکیت شغل توسط کارفرما
async function getOwnedJob(jobId, employerId) {
  return prisma.jobPosition.findFirst({
    where: { id: jobId, employerId },
  });
}

// بررسی اینکه سؤال متعلق به همین شغل است
async function getQuestionOfJob(questionId, jobId) {
  return prisma.question.findFirst({
    where: { id: questionId, jobPositionId: jobId },
  });
}

// ==========================================================================
// قوانین امتیازدهی (ScoringRule) — به یک سؤال وابسته‌اند
// ==========================================================================

// افزودن قانون امتیاز به یک سؤال
// POST /api/jobs/:id/questions/:questionId/scoring-rules
async function addScoringRule(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const question = await getQuestionOfJob(req.params.questionId, job.id);
    if (!question) return res.status(404).json({ message: "سؤال یافت نشد." });

    const { operator, value, points, label, isActive } = req.body;

    if (!operator || !OPERATORS.includes(operator)) {
      return res.status(400).json({
        message: `عملگر نامعتبر است. مقادیر مجاز: ${OPERATORS.join(", ")}`,
      });
    }
    if (points == null || Number.isNaN(Number(points))) {
      return res.status(400).json({ message: "مقدار امتیاز (points) الزامی و باید عدد باشد." });
    }

    const rule = await prisma.scoringRule.create({
      data: {
        questionId: question.id,
        operator,
        value: value != null ? String(value) : null,
        points: Number(points),
        label: label || null,
        isActive: isActive != null ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json({ message: "قانون امتیاز اضافه شد.", rule });
  } catch (err) {
    console.error("addScoringRule error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// لیست قوانین امتیاز یک سؤال
// GET /api/jobs/:id/questions/:questionId/scoring-rules
async function listScoringRules(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const question = await getQuestionOfJob(req.params.questionId, job.id);
    if (!question) return res.status(404).json({ message: "سؤال یافت نشد." });

    const rules = await prisma.scoringRule.findMany({
      where: { questionId: question.id },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ rules });
  } catch (err) {
    console.error("listScoringRules error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// ویرایش قانون امتیاز
// PUT /api/jobs/:id/scoring-rules/:ruleId
async function updateScoringRule(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    // قانون باید به سؤالی از همین شغل تعلق داشته باشد
    const existing = await prisma.scoringRule.findFirst({
      where: { id: req.params.ruleId, question: { jobPositionId: job.id } },
    });
    if (!existing) return res.status(404).json({ message: "قانون یافت نشد." });

    const { operator, value, points, label, isActive } = req.body;

    if (operator && !OPERATORS.includes(operator)) {
      return res.status(400).json({
        message: `عملگر نامعتبر است. مقادیر مجاز: ${OPERATORS.join(", ")}`,
      });
    }

    const data = {};
    if (operator !== undefined) data.operator = operator;
    if (value !== undefined) data.value = value != null ? String(value) : null;
    if (points !== undefined) data.points = Number(points);
    if (label !== undefined) data.label = label;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const rule = await prisma.scoringRule.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({ message: "قانون امتیاز ویرایش شد.", rule });
  } catch (err) {
    console.error("updateScoringRule error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// حذف قانون امتیاز
// DELETE /api/jobs/:id/scoring-rules/:ruleId
async function deleteScoringRule(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const existing = await prisma.scoringRule.findFirst({
      where: { id: req.params.ruleId, question: { jobPositionId: job.id } },
    });
    if (!existing) return res.status(404).json({ message: "قانون یافت نشد." });

    await prisma.scoringRule.delete({ where: { id: existing.id } });
    return res.status(200).json({ message: "قانون امتیاز حذف شد." });
  } catch (err) {
    console.error("deleteScoringRule error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// ==========================================================================
// قوانین رد خودکار (RejectionRule) — به شغل وابسته‌اند، می‌توانند به یک سؤال هم اشاره کنند
// ==========================================================================

// افزودن قانون رد
// POST /api/jobs/:id/rejection-rules
async function addRejectionRule(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const { questionId, operator, value, reason, isActive } = req.body;

    if (!operator || !OPERATORS.includes(operator)) {
      return res.status(400).json({
        message: `عملگر نامعتبر است. مقادیر مجاز: ${OPERATORS.join(", ")}`,
      });
    }

    // اگر به سؤالی اشاره دارد، آن سؤال باید متعلق به همین شغل باشد
    if (questionId) {
      const q = await getQuestionOfJob(questionId, job.id);
      if (!q) return res.status(400).json({ message: "سؤال متعلق به این شغل نیست." });
    }

    const rule = await prisma.rejectionRule.create({
      data: {
        jobPositionId: job.id,
        questionId: questionId || null,
        operator,
        value: value != null ? String(value) : null,
        reason: reason || null,
        isActive: isActive != null ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json({ message: "قانون رد اضافه شد.", rule });
  } catch (err) {
    console.error("addRejectionRule error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// لیست قوانین رد یک شغل
// GET /api/jobs/:id/rejection-rules
async function listRejectionRules(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const rules = await prisma.rejectionRule.findMany({
      where: { jobPositionId: job.id },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ rules });
  } catch (err) {
    console.error("listRejectionRules error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// ویرایش قانون رد
// PUT /api/jobs/:id/rejection-rules/:ruleId
async function updateRejectionRule(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const existing = await prisma.rejectionRule.findFirst({
      where: { id: req.params.ruleId, jobPositionId: job.id },
    });
    if (!existing) return res.status(404).json({ message: "قانون یافت نشد." });

    const { questionId, operator, value, reason, isActive } = req.body;

    if (operator && !OPERATORS.includes(operator)) {
      return res.status(400).json({
        message: `عملگر نامعتبر است. مقادیر مجاز: ${OPERATORS.join(", ")}`,
      });
    }
    if (questionId) {
      const q = await getQuestionOfJob(questionId, job.id);
      if (!q) return res.status(400).json({ message: "سؤال متعلق به این شغل نیست." });
    }

    const data = {};
    if (questionId !== undefined) data.questionId = questionId || null;
    if (operator !== undefined) data.operator = operator;
    if (value !== undefined) data.value = value != null ? String(value) : null;
    if (reason !== undefined) data.reason = reason;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const rule = await prisma.rejectionRule.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({ message: "قانون رد ویرایش شد.", rule });
  } catch (err) {
    console.error("updateRejectionRule error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// حذف قانون رد
// DELETE /api/jobs/:id/rejection-rules/:ruleId
async function deleteRejectionRule(req, res) {
  try {
    const job = await getOwnedJob(req.params.id, req.employer.id);
    if (!job) return res.status(404).json({ message: "شغل یافت نشد." });

    const existing = await prisma.rejectionRule.findFirst({
      where: { id: req.params.ruleId, jobPositionId: job.id },
    });
    if (!existing) return res.status(404).json({ message: "قانون یافت نشد." });

    await prisma.rejectionRule.delete({ where: { id: existing.id } });
    return res.status(200).json({ message: "قانون رد حذف شد." });
  } catch (err) {
    console.error("deleteRejectionRule error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

module.exports = {
  addScoringRule,
  listScoringRules,
  updateScoringRule,
  deleteScoringRule,
  addRejectionRule,
  listRejectionRules,
  updateRejectionRule,
  deleteRejectionRule,
};
