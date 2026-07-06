"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Filter,
  X,
  Download,
  Search,
  RotateCcw,
  FileText,
  ChevronDown,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import {
  applicationsApi,
  ApiError,
  CATEGORY_LABELS,
  STATUS_LABELS,
  MANUAL_STATUSES,
  type ApplicantListItem,
  type ApplicantDetail,
  type ApplicantFilters,
} from "@/lib/api";

// رنگ نشان دسته‌بندی
function categoryStyle(category: string | null) {
  switch (category) {
    case "EXCELLENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "VERY_GOOD":
      return "bg-green-50 text-green-700 border-green-100";
    case "GOOD":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "AVERAGE":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

// رنگ نشان وضعیت
function statusStyle(status: string) {
  switch (status) {
    case "ACCEPTED":
    case "HIRED":
      return "bg-emerald-50 text-emerald-700";
    case "SHORTLISTED":
      return "bg-brand-50 text-brand-700";
    case "UNDER_REVIEW":
      return "bg-blue-50 text-blue-700";
    case "REJECTED":
    case "REJECTED_AUTO":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (_) {
    return iso;
  }
}

// نمایش خوانای مقدار پاسخ
function formatAnswer(value: any): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join("، ");
  if (value === "true") return "بله";
  if (value === "false") return "خیر";
  return String(value);
}

// ============================================================================
// تب مشاهده و بررسی متقاضیان
// ============================================================================
export default function ApplicantsTab({ jobId }: { jobId: string }) {
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [maxPossibleScore, setMaxPossibleScore] = useState<number>(0);
  // مهارت‌های تعریف‌شده‌ی شغل (برای منوی فیلتر) و منوی بازشونده
  const [jobSkills, setJobSkills] = useState<string[]>([]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // فیلترها
  const [filters, setFilters] = useState<ApplicantFilters>({ sort: "score_desc" });
  const [showFilters, setShowFilters] = useState(false);

  // متقاضی انتخاب‌شده برای نمایش جزئیات
  const [selected, setSelected] = useState<ApplicantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(
    async (activeFilters: ApplicantFilters) => {
      setLoading(true);
      setError(null);
      try {
        const res = await applicationsApi.listApplicants(jobId, activeFilters);
        setApplicants(res.applicants);
        setMaxPossibleScore(res.job.maxPossibleScore ?? 0);
        setJobSkills(res.job.requiredSkills ?? []);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "خطا در دریافت متقاضیان."
        );
      } finally {
        setLoading(false);
      }
    },
    [jobId]
  );

  useEffect(() => {
    load({ sort: "score_desc" });
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load(filters);
  }

  function resetFilters() {
    const cleared: ApplicantFilters = { sort: "score_desc" };
    setFilters(cleared);
    load(cleared);
  }

  // مهارت‌های انتخاب‌شده در فیلتر (از رشته‌ی filters.skills)
  const selectedSkillFilters = (filters.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // تیک زدن/برداشتن یک مهارت در فیلتر
  function toggleSkillFilter(skill: string) {
    const set = new Set(selectedSkillFilters);
    if (set.has(skill)) set.delete(skill);
    else set.add(skill);
    setFilters({ ...filters, skills: Array.from(set).join(",") });
  }

  async function openDetail(applicationId: string) {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await applicationsApi.getApplicant(jobId, applicationId);
      setSelected(res);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در دریافت جزئیات.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    setStatusSaving(true);
    try {
      await applicationsApi.updateStatus(jobId, selected.applicationId, status);
      setSelected({ ...selected, status });
      setApplicants((prev) =>
        prev.map((a) =>
          a.applicationId === selected.applicationId ? { ...a, status } : a
        )
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function downloadResume() {
    if (!selected) return;
    try {
      await applicationsApi.downloadResume(
        jobId,
        selected.applicationId,
        selected.resume.fileName
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در دانلود رزومه.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div>
      {/* سرصفحه تب */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">متقاضیان</h2>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Filter size={16} />
          فیلترها
        </button>
      </div>

      {/* فیلترهای پیشرفته — کشویی (Accordion) با انیمیشن نرم */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          showFilters ? "mb-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            {/* فیلترهای اصلی در یک ردیف */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* وضعیت */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  وضعیت
                </label>
                <select
                  value={filters.status ?? ""}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={inputClass}
                >
                  <option value="">همه</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* مهارت‌ها (منوی کشویی) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  مهارت‌ها
                </label>
                {jobSkills.length === 0 ? (
                  <div className={`${inputClass} text-slate-400`}>—</div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSkillMenuOpen((o) => !o)}
                      className={`${inputClass} flex items-center justify-between text-right`}
                    >
                      <span className={selectedSkillFilters.length ? "" : "text-slate-400"}>
                        {selectedSkillFilters.length
                          ? `${selectedSkillFilters.length} مهارت انتخاب شد`
                          : "انتخاب مهارت‌ها"}
                      </span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>
                    {skillMenuOpen && (
                      <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                        {jobSkills.map((skill, i) => {
                          const checked = selectedSkillFilters.includes(skill);
                          return (
                            <label
                              key={i}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSkillFilter(skill)}
                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                              {skill}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* حداقل سابقه */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  حداقل سابقه (سال)
                </label>
                <input
                  type="number"
                  value={filters.minExperience ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, minExperience: e.target.value })
                  }
                  placeholder="مثلاً 3"
                  className={inputClass}
                />
              </div>

              {/* مرتب‌سازی */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  مرتب‌سازی
                </label>
                <select
                  value={filters.sort ?? "score_desc"}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  className={inputClass}
                >
                  <option value="score_desc">بیشترین امتیاز</option>
                  <option value="score_asc">کمترین امتیاز</option>
                  <option value="date_desc">جدیدترین</option>
                  <option value="date_asc">قدیمی‌ترین</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                <Search size={16} />
                اعمال فیلتر
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw size={16} />
                پاک کردن
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* لیست متقاضیان */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      ) : applicants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          متقاضی‌ای با این شرایط یافت نشد.
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-400">{applicants.length} متقاضی</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">نام</th>
                  <th className="px-4 py-3 font-medium">
                    امتیاز{" "}
                    <span className="font-normal text-slate-400">
                      (امتیاز کل: {maxPossibleScore})
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">دسته‌بندی</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">سابقه</th>
                  <th className="px-4 py-3 font-medium">تاریخ ثبت</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((a) => (
                  <tr
                    key={a.applicationId}
                    onClick={() => openDetail(a.applicationId)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {a.fullName}
                    </td>
                    <td className="px-4 py-3">
                      {/* فقط عددِ امتیاز مکتسبه‌ی خود کارجو */}
                      <span className="font-bold text-slate-800">
                        {a.finalScore ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${categoryStyle(
                          a.category
                        )}`}
                      >
                        {a.category ? CATEGORY_LABELS[a.category] || a.category : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusStyle(
                          a.status
                        )}`}
                      >
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {a.experience != null ? `${a.experience} سال` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(a.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="text-xs text-brand-600">مشاهده</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* پنجره جزئیات متقاضی */}
      {(selected || detailLoading) && (
        <div
          className="fixed inset-0 z-30 flex justify-start bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-brand-600" size={28} />
              </div>
            ) : selected ? (
              <div>
                <div className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white p-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {selected.applicant.fullName}
                    </h2>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      {selected.applicant.email && (
                        <span dir="ltr">{selected.applicant.email}</span>
                      )}
                      {selected.applicant.phone && (
                        <span dir="ltr">{selected.applicant.phone}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs text-slate-500">امتیاز نهایی</p>
                      <p className="mt-1 text-2xl font-bold text-slate-800">
                        {selected.finalScore ?? "-"}
                      </p>
                    </div>
                    <div className="flex-1 rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs text-slate-500">دسته‌بندی</p>
                      <span
                        className={`mt-2 inline-block rounded-full border px-3 py-1 text-sm ${categoryStyle(
                          selected.category
                        )}`}
                      >
                        {selected.category
                          ? CATEGORY_LABELS[selected.category] || selected.category
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {selected.rejectionReason && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
                      <span className="font-medium">دلیل رد خودکار: </span>
                      {selected.rejectionReason}
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-700">رزومه</h3>
                    {selected.resume.available ? (
                      <button
                        onClick={downloadResume}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Download size={16} />
                        دانلود رزومه
                        {selected.resume.fileName && (
                          <span className="text-xs text-slate-400" dir="ltr">
                            ({selected.resume.fileName})
                          </span>
                        )}
                      </button>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-slate-400">
                        <FileText size={16} />
                        رزومه‌ای ثبت نشده است.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-700">
                      وضعیت متقاضی
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {MANUAL_STATUSES.map((st) => (
                        <button
                          key={st}
                          onClick={() => changeStatus(st)}
                          disabled={statusSaving}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            selected.status === st
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {STATUS_LABELS[st] || st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-bold text-slate-700">
                      پاسخ‌های فرم
                    </h3>
                    {selected.answers.length === 0 ? (
                      <p className="text-sm text-slate-400">پاسخی ثبت نشده است.</p>
                    ) : (
                      <div className="space-y-3">
                        {selected.answers.map((ans, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-slate-500">
                                {ans.label}
                              </p>
                              {ans.earnedPoints != null && ans.earnedPoints !== 0 && (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                                  +{ans.earnedPoints} امتیاز
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              {ans.type === "FILE_UPLOAD" &&
                              typeof ans.value === "string" &&
                              ans.value.startsWith("uploads/") ? (
                                // فایل آپلودشده → دکمه دانلود
                                <button
                                  type="button"
                                  onClick={() =>
                                    applicationsApi
                                      .downloadAnswerFile(
                                        jobId,
                                        selected.applicationId,
                                        ans.questionId,
                                        ans.value.split("/").pop()
                                      )
                                      .catch((err) =>
                                        alert(
                                          err instanceof ApiError
                                            ? err.message
                                            : "خطا در دانلود فایل."
                                        )
                                      )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Paperclip size={14} />
                                  دانلود فایل
                                </button>
                              ) : ans.type === "FILE_UPLOAD" &&
                                typeof ans.value === "string" &&
                                /^https?:\/\//.test(ans.value) ? (
                                // لینک واردشده → پیوند قابل کلیک
                                <a
                                  href={ans.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  dir="ltr"
                                  className="inline-flex items-center gap-1.5 break-all text-sm text-brand-600 hover:underline"
                                >
                                  <ExternalLink size={14} />
                                  {ans.value}
                                </a>
                              ) : (
                                <p className="text-sm text-slate-800">
                                  {formatAnswer(ans.value)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
