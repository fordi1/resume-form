// ============================================================================
// کنترلر مدیریت موقعیت‌های شغلی (JobPosition)
// ============================================================================
// همه‌ی این مسیرها فقط برای کارفرمای واردشده هستند (با میدل‌ور authGuard).
// هر کارفرما فقط به شغل‌های خودش دسترسی دارد (بررسی مالکیت انجام می‌شود).
// ============================================================================
const prisma = require("../../config/prisma");
const { slugify } = require("../../utils/slugify");

// مقادیر مجاز برای نوع همکاری (فقط برای اعتبارسنجی نرم)
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "REMOTE", "CONTRACT", "INTERNSHIP"];

// --------------------------------------------------------------------------
// ساخت یک slug یکتا بر اساس عنوان شغل
// اگر "backend-developer" از قبل وجود داشته باشد، "backend-developer-2" و ... می‌سازد.
// --------------------------------------------------------------------------
async function generateUniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  let counter = 1;

  // تا وقتی slug تکراری است، شماره اضافه کن
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.jobPosition.findUnique({ where: { slug } })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
}

// requiredSkills را همیشه به صورت رشته JSON ذخیره می‌کنیم
function normalizeSkills(skills) {
  if (!skills) return "[]";
  if (Array.isArray(skills)) return JSON.stringify(skills);
  // اگر کاربر رشته‌ای مثل "Docker, PostgreSQL" فرستاد
  if (typeof skills === "string") {
    const arr = skills.split(",").map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  return "[]";
}

// خروجی شغل را برای کلاینت آماده می‌کند (requiredSkills را به آرایه برمی‌گرداند)
function presentJob(job) {
  let requiredSkills = [];
  try {
    requiredSkills = JSON.parse(job.requiredSkills || "[]");
  } catch (_) {
    requiredSkills = [];
  }
  return { ...job, requiredSkills };
}

// --------------------------------------------------------------------------
// ساخت موقعیت شغلی جدید  —  POST /api/jobs
// هنگام ساخت شغل، به‌صورت خودکار یک فرم خالی هم برای آن ساخته می‌شود.
// --------------------------------------------------------------------------
async function createJob(req, res) {
  try {
    const {
      title,
      description,
      requiredSkills,
      minExperience,
      salaryMin,
      salaryMax,
      employmentType,
      location,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "عنوان شغل الزامی است." });
    }
    if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType)) {
      return res.status(400).json({
        message: `نوع همکاری نامعتبر است. مقادیر مجاز: ${EMPLOYMENT_TYPES.join(", ")}`,
      });
    }

    const slug = await generateUniqueSlug(title);

    const job = await prisma.jobPosition.create({
      data: {
        employerId: req.employer.id,
        title,
        description: description || null,
        requiredSkills: normalizeSkills(requiredSkills),
        minExperience: minExperience != null ? Number(minExperience) : null,
        salaryMin: salaryMin != null ? Number(salaryMin) : null,
        salaryMax: salaryMax != null ? Number(salaryMax) : null,
        employmentType: employmentType || null,
        location: location || null,
        slug,
        // ساخت خودکار فرم خالی برای این شغل
        form: { create: { title: `فرم استخدام ${title}` } },
      },
      include: { form: true },
    });

    return res.status(201).json({
      message: "موقعیت شغلی ساخته شد.",
      applyUrl: `/apply/${slug}`, // لینک اختصاصی فرم
      job: presentJob(job),
    });
  } catch (err) {
    console.error("createJob error:", err);
    return res.status(500).json({ message: "خطای سرور در ساخت شغل." });
  }
}

// --------------------------------------------------------------------------
// لیست شغل‌های کارفرما  —  GET /api/jobs
// --------------------------------------------------------------------------
async function listJobs(req, res) {
  try {
    const jobs = await prisma.jobPosition.findMany({
      where: { employerId: req.employer.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { applications: true, questions: true } },
      },
    });
    return res.status(200).json({ jobs: jobs.map(presentJob) });
  } catch (err) {
    console.error("listJobs error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// مشاهده یک شغل + فرم و سؤالات  —  GET /api/jobs/:id
// --------------------------------------------------------------------------
async function getJob(req, res) {
  try {
    const job = await prisma.jobPosition.findFirst({
      where: { id: req.params.id, employerId: req.employer.id },
      include: {
        form: true,
        questions: { orderBy: { order: "asc" } },
      },
    });
    if (!job) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }
    return res.status(200).json({ job: presentJob(job) });
  } catch (err) {
    console.error("getJob error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// ویرایش شغل  —  PUT /api/jobs/:id
// --------------------------------------------------------------------------
async function updateJob(req, res) {
  try {
    // بررسی مالکیت
    const existing = await prisma.jobPosition.findFirst({
      where: { id: req.params.id, employerId: req.employer.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }

    const {
      title,
      description,
      requiredSkills,
      minExperience,
      salaryMin,
      salaryMax,
      employmentType,
      location,
      isActive,
    } = req.body;

    if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType)) {
      return res.status(400).json({
        message: `نوع همکاری نامعتبر است. مقادیر مجاز: ${EMPLOYMENT_TYPES.join(", ")}`,
      });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (requiredSkills !== undefined) data.requiredSkills = normalizeSkills(requiredSkills);
    if (minExperience !== undefined) data.minExperience = minExperience != null ? Number(minExperience) : null;
    if (salaryMin !== undefined) data.salaryMin = salaryMin != null ? Number(salaryMin) : null;
    if (salaryMax !== undefined) data.salaryMax = salaryMax != null ? Number(salaryMax) : null;
    if (employmentType !== undefined) data.employmentType = employmentType;
    if (location !== undefined) data.location = location;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const job = await prisma.jobPosition.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({ message: "شغل ویرایش شد.", job: presentJob(job) });
  } catch (err) {
    console.error("updateJob error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// حذف شغل  —  DELETE /api/jobs/:id
// (فرم، سؤالات و درخواست‌های مرتبط هم به‌خاطر onDelete: Cascade حذف می‌شوند)
// --------------------------------------------------------------------------
async function deleteJob(req, res) {
  try {
    const existing = await prisma.jobPosition.findFirst({
      where: { id: req.params.id, employerId: req.employer.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }
    await prisma.jobPosition.delete({ where: { id: existing.id } });
    return res.status(200).json({ message: "شغل حذف شد." });
  } catch (err) {
    console.error("deleteJob error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

// --------------------------------------------------------------------------
// فعال/غیرفعال کردن شغل  —  PATCH /api/jobs/:id/toggle
// --------------------------------------------------------------------------
async function toggleJob(req, res) {
  try {
    const existing = await prisma.jobPosition.findFirst({
      where: { id: req.params.id, employerId: req.employer.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "شغل یافت نشد." });
    }
    const job = await prisma.jobPosition.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive },
    });
    return res.status(200).json({
      message: job.isActive ? "شغل فعال شد." : "شغل غیرفعال شد.",
      job: presentJob(job),
    });
  } catch (err) {
    console.error("toggleJob error:", err);
    return res.status(500).json({ message: "خطای سرور." });
  }
}

module.exports = {
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
  toggleJob,
};
