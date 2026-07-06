"use client";

import { useState } from "react";
import { Save, Loader2, Plus, X, CheckCircle2 } from "lucide-react";
import { jobsApi, ApiError, EMPLOYMENT_TYPES, type Job } from "@/lib/api";

// جداکننده سه‌رقمی
function formatThousands(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function unformat(value: string): string {
  return value.replace(/\D/g, "");
}

// ============================================================================
// تب ویرایش موقعیت شغلی
// ============================================================================
// اطلاعات اولیه از شغلِ بارگذاری‌شده می‌آید و با ذخیره، به‌روزرسانی (PUT) می‌شود.
// ============================================================================
export default function EditJobTab({
  job,
  onUpdated,
}: {
  job: Job;
  onUpdated: () => Promise<void>;
}) {
  const [title, setTitle] = useState(job.title || "");
  const [description, setDescription] = useState(job.description || "");
  const [skills, setSkills] = useState<string[]>(
    job.requiredSkills && job.requiredSkills.length > 0
      ? job.requiredSkills
      : [""]
  );
  const [minExperience, setMinExperience] = useState(
    job.minExperience != null ? String(job.minExperience) : ""
  );
  const [salaryMin, setSalaryMin] = useState(formatThousands(job.salaryMin));
  const [salaryMax, setSalaryMax] = useState(formatThousands(job.salaryMax));
  const [employmentType, setEmploymentType] = useState(job.employmentType || "");
  const [location, setLocation] = useState(job.location || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      return next.length > 0 ? next : [""];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      setError("عنوان شغل الزامی است.");
      return;
    }

    const cleanSkills = skills.map((s) => s.trim()).filter(Boolean);
    const min = salaryMin ? Number(unformat(salaryMin)) : undefined;
    const max = salaryMax ? Number(unformat(salaryMax)) : undefined;
    if (min != null && max != null && min > max) {
      setError("حداقل حقوق نمی‌تواند از حداکثر حقوق بیشتر باشد.");
      return;
    }

    setLoading(true);
    try {
      await jobsApi.update(job.id, {
        title: title.trim(),
        description: description || null,
        requiredSkills: cleanSkills,
        minExperience: minExperience ? Number(minExperience) : null,
        salaryMin: min ?? null,
        salaryMax: max ?? null,
        employmentType: employmentType || null,
        location: location || null,
      } as Partial<Job>);
      setSuccess(true);
      await onUpdated();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در به‌روزرسانی شغل.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-slate-50 py-3 px-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-bold text-slate-800">ویرایش موقعیت شغلی</h2>
      <p className="mt-1 text-sm text-slate-500">
        اطلاعات این شغل را ویرایش و ذخیره کنید.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-100">
            <CheckCircle2 size={18} />
            تغییرات با موفقیت ذخیره شد.
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
              className={inputClass}
            />
          </div>

          {/* مهارت‌ها — داینامیک */}
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

          {/* محدوده حقوق */}
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
              className={inputClass}
            />
          </div>

          {/* دکمه ذخیره */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save size={18} />
                  ذخیره تغییرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
