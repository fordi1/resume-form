"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListChecks,
  X,
} from "lucide-react";
import { formApi, ApiError, QUESTION_TYPES, type Question } from "@/lib/api";

// انواعی که به گزینه نیاز دارند
const CHOICE_TYPES = ["SINGLE_CHOICE", "MULTI_CHOICE"];
// تعداد گزینه پیش‌فرض هنگام انتخاب سؤال گزینه‌ای
const DEFAULT_OPTION_COUNT = 4;

// برچسب فارسی نوع سؤال
function typeLabel(type: string) {
  return QUESTION_TYPES.find((t) => t.value === type)?.label || type;
}

// ============================================================================
// تب طراحی فرم استخدام
// ============================================================================
// state سؤالات از کامپوننت والد (صفحه شغل) می‌آید تا هدر بتواند از تعداد سؤالات
// برای نمایش شرطی لینک اختصاصی استفاده کند.
// ============================================================================
export default function FormDesignerTab({
  jobId,
  questions,
  setQuestions,
  reload,
}: {
  jobId: string;
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  reload: () => Promise<void>;
}) {
  // فرم افزودن سؤال
  const [qType, setQType] = useState("SHORT_TEXT");
  const [qLabel, setQLabel] = useState("");
  const [qHelp, setQHelp] = useState("");
  const [qRequired, setQRequired] = useState(false);
  const [qOptions, setQOptions] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [busyQ, setBusyQ] = useState<string | null>(null);

  const isChoice = CHOICE_TYPES.includes(qType);
  const isFileUpload = qType === "FILE_UPLOAD";

  // ---- تغییر نوع سؤال ----
  function handleTypeChange(newType: string) {
    setQType(newType);
    setAddError(null);
    if (CHOICE_TYPES.includes(newType)) {
      setQOptions((prev) =>
        prev.length > 0 ? prev : Array(DEFAULT_OPTION_COUNT).fill("")
      );
    } else {
      setQOptions([]);
    }
  }

  // ---- مدیریت فیلدهای گزینه ----
  function updateOption(index: number, value: string) {
    setQOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }
  function addOption() {
    setQOptions((prev) => [...prev, ""]);
  }
  function removeOption(index: number) {
    setQOptions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length >= 2 ? next : [...next, ...Array(2 - next.length).fill("")];
    });
  }

  function resetForm() {
    setQLabel("");
    setQHelp("");
    setQRequired(false);
    setQOptions([]);
    setQType("SHORT_TEXT");
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!qLabel.trim()) {
      setAddError("متن سؤال الزامی است.");
      return;
    }

    let options: { value: string; label: string }[] | undefined;
    if (CHOICE_TYPES.includes(qType)) {
      const clean = qOptions.map((o) => o.trim()).filter(Boolean);
      if (clean.length < 2) {
        setAddError("برای سؤال گزینه‌ای، حداقل دو گزینه معتبر وارد کنید.");
        return;
      }
      options = clean.map((o) => ({ value: o, label: o }));
    }

    setAdding(true);
    try {
      await formApi.addQuestion(jobId, {
        type: qType,
        label: qLabel.trim(),
        helpText: qHelp || undefined,
        isRequired: qRequired,
        options,
      });
      resetForm();
      await reload();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "خطا در افزودن سؤال.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("این سؤال حذف شود؟")) return;
    setBusyQ(id);
    try {
      await formApi.deleteQuestion(jobId, id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در حذف سؤال.");
    } finally {
      setBusyQ(null);
    }
  }

  // جابه‌جایی سؤال بالا/پایین و ذخیره ترتیب جدید
  async function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setQuestions(reordered); // به‌روزرسانی خوش‌بینانه

    try {
      await formApi.reorder(
        jobId,
        reordered.map((q) => q.id)
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در تغییر ترتیب.");
      await reload();
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100";

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ListChecks size={20} className="text-slate-700" />
        <h2 className="text-lg font-bold text-slate-800">طراحی فرم استخدام</h2>
        <span className="text-sm text-slate-400">({questions.length} سؤال)</span>
      </div>

      {/* فرم افزودن سؤال جدید */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
          <Plus size={18} className="text-brand-600" />
          افزودن سؤال جدید
        </h3>

        {addError && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {addError}
          </div>
        )}

        <form onSubmit={handleAddQuestion} className="space-y-4">
          {/* نوع سؤال */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              نوع سؤال
            </label>
            <select
              value={qType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className={inputClass}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* متن سؤال */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              متن سؤال <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={qLabel}
              onChange={(e) => setQLabel(e.target.value)}
              placeholder="مثلاً چند سال سابقه برنامه‌نویسی دارید؟"
              className={inputClass}
            />
          </div>

          {/* توضیح کمکی */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              توضیح کمکی (اختیاری)
            </label>
            <input
              type="text"
              value={qHelp}
              onChange={(e) => setQHelp(e.target.value)}
              placeholder="توضیح کوتاه برای متقاضی"
              className={inputClass}
            />
          </div>

          {/* گزینه‌ها — فقط برای انواع تک/چندگزینه‌ای */}
          {isChoice && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                گزینه‌ها
              </label>
              <div className="space-y-2">
                {qOptions.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500 border border-slate-200">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`گزینه ${index + 1}`}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      title="حذف گزینه"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-100 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-200"
              >
                <Plus size={16} />
                افزودن گزینه
              </button>
            </div>
          )}

          {/* راهنمای آپلود فایل */}
          {isFileUpload && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              متقاضی برای این سؤال یک فایل بارگذاری می‌کند. (در نسخه اول، رزومه
              اصلی در بالای فرم متقاضی آپلود می‌شود.)
            </div>
          )}

          {/* الزامی */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={qRequired}
              onChange={(e) => setQRequired(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            پاسخ به این سؤال الزامی است
          </label>

          {/* دکمه افزودن */}
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {adding ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                در حال افزودن...
              </>
            ) : (
              <>
                <Plus size={18} />
                افزودن سؤال
              </>
            )}
          </button>
        </form>
      </div>

      {/* لیست سؤالات طرح‌شده */}
      <div className="mt-6">
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
            هنوز سؤالی اضافه نشده است. از فرم بالا اولین سؤال را بسازید.
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{q.label}</span>
                    {q.isRequired && (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] text-red-600">
                        الزامی
                      </span>
                    )}
                    <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">
                      {typeLabel(q.type)}
                    </span>
                  </div>
                  {q.helpText && (
                    <p className="mt-1 text-xs text-slate-400">{q.helpText}</p>
                  )}
                  {q.options && q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((opt, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500 border border-slate-100"
                        >
                          {opt.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    title="بالا"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === questions.length - 1}
                    title="پایین"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    disabled={busyQ === q.id}
                    title="حذف"
                    className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
