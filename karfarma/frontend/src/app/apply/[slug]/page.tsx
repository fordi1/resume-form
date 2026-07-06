"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Clock,
  Wrench,
  Banknote,
  History,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Send,
  AlertCircle,
  X,
} from "lucide-react";
import {
  applicationsApi,
  ApiError,
  EMPLOYMENT_TYPES,
  type PublicForm,
  type PublicFormQuestion,
} from "@/lib/api";

// برچسب فارسی نوع همکاری
function employmentLabel(value?: string | null): string | null {
  if (!value) return null;
  return EMPLOYMENT_TYPES.find((t) => t.value === value)?.label || value;
}

// جداکننده سه‌رقمی مبلغ
function formatMoney(n?: number | null): string | null {
  if (n == null) return null;
  return Number(n).toLocaleString("en-US");
}

// ساخت متن بازه حقوقی بر اساس حداقل/حداکثر
function salaryText(min?: number | null, max?: number | null): string | null {
  const a = formatMoney(min);
  const b = formatMoney(max);
  if (a && b) return `${a} تا ${b} تومان`;
  if (a) return `از ${a} تومان`;
  if (b) return `تا ${b} تومان`;
  return null;
}

export default function ApplyPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [data, setData] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // اطلاعات متقاضی
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  // سابقه کاری (سال) و مهارت‌های تیک‌خورده
  const [experienceYears, setExperienceYears] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // پاسخ‌ها: نگاشت questionId → مقدار
  const [answers, setAnswers] = useState<Record<string, any>>({});
  // فایل‌های سؤالات «آپلود فایل»: نگاشت questionId → File
  const [questionFiles, setQuestionFiles] = useState<Record<string, File>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await applicationsApi.getPublicForm(slug);
        setData(res);
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : "خطا در دریافت فرم."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  function setAnswer(questionId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  // مدیریت انتخاب چندگزینه‌ای
  function toggleMultiChoice(questionId: string, optionValue: string) {
    setAnswers((prev) => {
      const current: string[] = Array.isArray(prev[questionId])
        ? prev[questionId]
        : [];
      const exists = current.includes(optionValue);
      const next = exists
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [questionId]: next };
    });
  }

  // تیک زدن/برداشتن یک مهارت
  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // انتخاب یا حذف فایلِ یک سؤال آپلود فایل (لینک متنی جدا در answers نگه داشته می‌شود)
  function setQuestionFile(questionId: string, file: File | null) {
    setQuestionFiles((prev) => {
      const next = { ...prev };
      if (file) next[questionId] = file;
      else delete next[questionId];
      return next;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== "application/pdf") {
      setSubmitError("فقط فایل PDF مجاز است.");
      e.target.value = "";
      return;
    }
    setSubmitError(null);
    setResume(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!data) return;
    if (!fullName.trim()) {
      setSubmitError("لطفاً نام و نام خانوادگی را وارد کنید.");
      return;
    }

    // بررسی سؤالات الزامی
    for (const q of data.questions) {
      if (q.isRequired) {
        const val = answers[q.id];
        let empty =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0);
        // برای سؤال آپلود فایل، وجود فایل هم پاسخ محسوب می‌شود
        if (q.type === "FILE_UPLOAD" && questionFiles[q.id]) empty = false;
        if (empty) {
          setSubmitError(`لطفاً به سؤال «${q.label}» پاسخ دهید.`);
          return;
        }
      }
    }

    // ساخت آرایه پاسخ‌ها
    const answersArray = data.questions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
      .map((q) => ({ questionId: q.id, value: answers[q.id] }));

    setSubmitting(true);
    try {
      await applicationsApi.submit(slug, {
        fullName: fullName.trim(),
        email: email || undefined,
        phone: phone || undefined,
        experienceYears: experienceYears !== "" ? experienceYears : undefined,
        skills: selectedSkills,
        answers: answersArray,
        resume,
        questionFiles,
      });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "خطا در ثبت درخواست."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-slate-50 py-3 px-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100";

  // ---- حالت‌های بارگذاری/خطا ----
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={30} />
      </main>
    );
  }

  if (loadError || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={24} />
          </div>
          <h1 className="text-lg font-bold text-slate-800">فرم در دسترس نیست</h1>
          <p className="mt-2 text-sm text-slate-500">
            {loadError || "این موقعیت شغلی فعال نیست یا وجود ندارد."}
          </p>
        </div>
      </main>
    );
  }

  // ---- صفحه موفقیت ----
  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="max-w-md rounded-2xl border border-green-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            درخواست شما ثبت شد!
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            از علاقه‌مندی شما به موقعیت «{data.job.title}» سپاسگزاریم. درخواست شما
            با موفقیت دریافت شد و توسط تیم استخدام بررسی خواهد شد.
          </p>
        </div>
      </main>
    );
  }

  // ---- فرم اصلی ----
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* کادر اطلاعات موقعیت شغلی — مینیمال */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          {/* ۱) عنوان شغل */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Briefcase size={18} />
            </div>
            <h1 className="text-lg font-extrabold leading-tight text-slate-800">
              {data.job.title}
            </h1>
          </div>

          {/* ۲) نشان‌های کوچک و افقی در یک ردیف: نوع همکاری، حقوق، محل کار */}
          {(employmentLabel(data.job.employmentType) ||
            salaryText(data.job.salaryMin, data.job.salaryMax) ||
            data.job.location) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {employmentLabel(data.job.employmentType) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  <Clock size={12} />
                  {employmentLabel(data.job.employmentType)}
                </span>
              )}
              {salaryText(data.job.salaryMin, data.job.salaryMax) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  <Banknote size={12} />
                  {salaryText(data.job.salaryMin, data.job.salaryMax)}
                </span>
              )}
              {data.job.location && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  <MapPin size={12} />
                  {data.job.location}
                </span>
              )}
            </div>
          )}

          {/* ۳) توضیحات شغل با منطق «ادامه مطلب» */}
          {data.job.description && (
            <div className="mt-3">
              <JobDescription text={data.job.description} />
            </div>
          )}
        </div>

        {/* کارت فرم */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
        >
          {submitError && (
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* اطلاعات فردی */}
          <h2 className="mb-4 font-bold text-slate-800">اطلاعات شما</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                نام و نام خانوادگی <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="نام کامل شما"
                  className={`${inputClass} pr-10`}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  ایمیل
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputClass} pr-10 text-left`}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  شماره تماس
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    className={`${inputClass} pr-10 text-left`}
                  />
                </div>
              </div>
            </div>

            {/* ردیف دوستونه: سابقه کاری + رزومه (هم‌ارتفاع و متقارن با ردیف ایمیل/تلفن) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* سابقه کاری (سال) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  سابقه کاری (سال)
                </label>
                <div className="relative">
                  <History
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="مثلاً 3"
                    className={`${inputClass} pr-10`}
                  />
                </div>
              </div>

              {/* آپلود رزومه — جمع‌وجور و هم‌ارتفاع با فیلد سابقه */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  رزومه (فقط PDF)
                </label>
                <label className="flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 transition hover:border-brand-400 hover:bg-brand-50/40">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    {resume ? <FileText size={16} /> : <Upload size={16} />}
                  </div>
                  <span className="flex-1 truncate text-sm">
                    {resume ? (
                      <span className="font-medium text-slate-700">{resume.name}</span>
                    ) : (
                      <span className="text-slate-500">انتخاب فایل رزومه (PDF)</span>
                    )}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* مهارت‌ها — ردیف تمام‌عرض زیر دو فیلد بالا */}
            {data.job.requiredSkills && data.job.requiredSkills.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  مهارت‌های شما را از میان موارد زیر انتخاب کنید:
                </label>
                <div className="flex flex-wrap gap-2">
                  {data.job.requiredSkills.map((skill, i) => {
                    const checked = selectedSkills.includes(skill);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                          checked
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Wrench size={13} />
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* سؤالات پویای فرم */}
          {data.questions.length > 0 && (
            <>
              <h2 className="mb-4 mt-8 font-bold text-slate-800">
                سؤالات تکمیلی
              </h2>
              <div className="space-y-5">
                {data.questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(val) => setAnswer(q.id, val)}
                    onToggleMulti={(opt) => toggleMultiChoice(q.id, opt)}
                    file={questionFiles[q.id]}
                    onFile={(f) => setQuestionFile(q.id, f)}
                    inputClass={inputClass}
                  />
                ))}
              </div>
            </>
          )}

          {/* دکمه ثبت */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                در حال ارسال...
              </>
            ) : (
              <>
                <Send size={18} />
                ثبت درخواست
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          اطلاعات شما تنها برای بررسی درخواست استخدام استفاده می‌شود.
        </p>
      </div>
    </main>
  );
}

// ============================================================================
// کامپوننت توضیحات شغل با منطق «ادامه مطلب» (بر اساس تعداد کاراکتر)
// ============================================================================
// اگر متن کمتر از ۱۰۰ کاراکتر باشد کامل نمایش داده می‌شود؛ در غیر این صورت فقط
// ۱۰۰ کاراکتر اول + دکمه‌ی «ادامه مطلب...» که با کلیک، کل متن باز می‌شود.
const DESCRIPTION_LIMIT = 100;

function JobDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > DESCRIPTION_LIMIT;
  const shown =
    !isLong || expanded ? text : `${text.slice(0, DESCRIPTION_LIMIT).trim()}…`;

  return (
    <div>
      <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
        {shown}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
        >
          {expanded ? "بستن" : "ادامه مطلب..."}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// کامپوننت نمایش هر سؤال بر اساس نوعش
// ============================================================================
function QuestionField({
  question,
  value,
  onChange,
  onToggleMulti,
  file,
  onFile,
  inputClass,
}: {
  question: PublicFormQuestion;
  value: any;
  onChange: (val: any) => void;
  onToggleMulti: (optionValue: string) => void;
  file?: File;
  onFile?: (f: File | null) => void;
  inputClass: string;
}) {
  const label = (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {question.label}
      {question.isRequired && <span className="text-red-500"> *</span>}
    </label>
  );

  const help = question.helpText ? (
    <p className="mb-2 text-xs text-slate-400">{question.helpText}</p>
  ) : null;

  switch (question.type) {
    case "LONG_TEXT":
      return (
        <div>
          {label}
          {help}
          <textarea
            rows={4}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </div>
      );

    case "NUMBER":
      return (
        <div>
          {label}
          {help}
          <input
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </div>
      );

    case "LINK":
      return (
        <div>
          {label}
          {help}
          <input
            type="url"
            dir="ltr"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className={`${inputClass} text-left`}
          />
        </div>
      );

    case "BOOLEAN":
      return (
        <div>
          {label}
          {help}
          <div className="flex gap-3">
            {[
              { v: "true", t: "بله" },
              { v: "false", t: "خیر" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => onChange(opt.v)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                  value === opt.v
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.t}
              </button>
            ))}
          </div>
        </div>
      );

    case "SINGLE_CHOICE":
      return (
        <div>
          {label}
          {help}
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                  value === opt.value
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      );

    case "MULTI_CHOICE": {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          {help}
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                  selected.includes(opt.value)
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggleMulti(opt.value)}
                  className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      );
    }

    case "FILE_UPLOAD":
      return (
        <div>
          {label}
          {help}
          {/* بخش اصلی: آپلود فایل واقعی */}
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <FileText size={18} />
              </div>
              <span className="flex-1 truncate text-sm font-medium text-slate-700">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => onFile && onFile(null)}
                title="حذف فایل"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-brand-400 hover:bg-brand-50/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <Upload size={18} />
              </div>
              <div className="flex-1 text-sm">
                <span className="font-medium text-slate-600">انتخاب فایل</span>
                <span className="block text-xs text-slate-400">حداکثر ۵ مگابایت</span>
              </div>
              <input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (onFile) onFile(f);
                }}
                className="hidden"
              />
            </label>
          )}

          {/* بخش دوم: لینک اختیاری (اگر فایلی آپلود نشده باشد) */}
          <input
            type="url"
            dir="ltr"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="یا آدرس لینک (مانند گیت‌هاب، پرتفولیو و...)"
            className={`${inputClass} mt-2 text-left text-sm`}
          />
        </div>
      );

    // SHORT_TEXT و پیش‌فرض
    default:
      return (
        <div>
          {label}
          {help}
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </div>
      );
  }
}
