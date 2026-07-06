"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, Loader2, Plus, X } from "lucide-react";
import { jobsApi, ApiError, EMPLOYMENT_TYPES } from "@/lib/api";

// افزودن جداکننده سه‌رقمی به عدد (مثلاً 15000000 → 15,000,000)
function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// حذف جداکننده‌ها و برگرداندن رقم خالص (مثلاً 15,000,000 → 15000000)
function unformat(value: string): string {
  return value.replace(/\D/g, "");
}

export default function NewJobPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // مهارت‌ها به صورت آرایه‌ای از فیلدهای مجزا (حداقل یک فیلد خالی)
  const [skills, setSkills] = useState<string[]>([""]);

  const [minExperience, setMinExperience] = useState("");

  // مبالغ حقوق: مقدار نمایشی با جداکننده نگه داشته می‌شود
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const [employmentType, setEmploymentType] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- مدیریت فیلدهای مهارت ----
  function updateSkill(index: number, value: string) {
    setSkills((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function addSkill() {
    setSkills((prev) => [...prev, ""]);
  }
  function removeSkill(index: number) {
    setSkills((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""]; // همیشه حداقل یک فیلد بماند
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("عنوان شغل الزامی است.");
      return;
    }

    // فقط مهارت‌های غیرخالی
    const cleanSkills = skills.map((s) => s.trim()).filter(Boolean);

    // اعتبارسنجی محدوده حقوق
    const min = salaryMin ? Number(unformat(salaryMin)) : undefined;
    const max = salaryMax ? Number(unformat(salaryMax)) : undefined;
    if (min != null && max != null && min > max) {
      setError("حداقل حقوق نمی‌تواند از حداکثر حقوق بیشتر باشد.");
      return;
    }

    setLoading(true);
    try {
      const res = await jobsApi.create({
        title: title.trim(),
        description: description || undefined,
        requiredSkills: cleanSkills.length > 0 ? cleanSkills : undefined,
        minExperience: minExperience ? Number(minExperience) : undefined,
        salaryMin: min,
        salaryMax: max,
        employmentType: employmentType || undefined,
        location: location || undefined,
      });
      router.push(`/dashboard/jobs/${res.job.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ساخت شغل.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-slate-50 py-3 px-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-3xl">
      {/* بازگشت */}
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowRight size={16} />
        بازگشت به لیست شغل‌ها
      </Link>

      <h1 className="text-2xl font-bold text-slate-800">ایجاد موقعیت شغلی</h1>
      <p className="mt-1 text-sm text-slate-500">
        اطلاعات شغل را وارد کنید. پس از ساخت، می‌توانید فرم استخدام آن را طراحی کنید.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* عنوان */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              عنوان شغل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً برنامه‌نویس Backend"
              className={inputClass}
            />
          </div>

          {/* توضیحات */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              توضیحات شغل
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="شرح وظایف و شرایط شغل..."
              className={inputClass}
            />
          </div>

          {/* مهارت‌ها — فیلدهای داینامیک */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              مهارت‌های موردنیاز
            </label>
            <div className="space-y-2">
              {skills.map((skill, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    placeholder={`مهارت ${index + 1} — مثلاً Docker`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    title="حذف مهارت"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSkill}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
            >
              <Plus size={16} />
              افزودن مهارت
            </button>
          </div>

          {/* سابقه و نوع همکاری */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                حداقل سابقه (سال)
              </label>
              <input
                type="number"
                min={0}
                value={minExperience}
                onChange={(e) => setMinExperience(e.target.value)}
                placeholder="مثلاً 3"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                نوع همکاری
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className={inputClass}
              >
                <option value="">انتخاب کنید</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* محدوده حقوق — با جداکننده سه‌رقمی */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                حداقل حقوق (تومان)
              </label>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={salaryMin}
                onChange={(e) => setSalaryMin(formatThousands(e.target.value))}
                placeholder="15,000,000"
                className={`${inputClass} text-left`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                حداکثر حقوق (تومان)
              </label>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={salaryMax}
                onChange={(e) => setSalaryMax(formatThousands(e.target.value))}
                placeholder="35,000,000"
                className={`${inputClass} text-left`}
              />
            </div>
          </div>

          {/* محل کار */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              محل کار
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="مثلاً تهران"
              className={inputClass}
            />
          </div>

          {/* دکمه‌ها */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  در حال ساخت...
                </>
              ) : (
                <>
                  <Save size={18} />
                  ساخت شغل و طراحی فرم
                </>
              )}
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              انصراف
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
