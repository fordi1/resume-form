"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Info,
  Hash,
  Type,
  ListChecks,
  ToggleLeft,
  Link2,
  Upload,
} from "lucide-react";
import {
  rulesApi,
  ApiError,
  RULE_OPERATORS,
  NO_VALUE_OPERATORS,
  operatorsForQuestionType,
  type Question,
  type ScoringRule,
  type RejectionRule,
} from "@/lib/api";

// دسته‌بندی نوع سؤال
const NUMBER_TYPE = "NUMBER";
const OPTION_TYPES = ["SINGLE_CHOICE", "MULTI_CHOICE", "BOOLEAN"];
const KEYWORD_TYPES = ["SHORT_TEXT", "LONG_TEXT"]; // فقط متنی → کلمات کلیدی
const PRESENCE_TYPES = ["LINK", "FILE_UPLOAD"]; // لینک/فایل → منطق صفر و یکی

type ActionType = "score" | "reject";

// یک قانون یکپارچه (چه امتیاز چه رد) برای نمایش داخل کارت سؤال
interface UnifiedRule {
  kind: ActionType;
  id: string;
  operator: string;
  value: string | null;
  points: number | null;
}

// برچسب فارسی عملگر
function operatorLabel(op: string) {
  return RULE_OPERATORS.find((o) => o.value === op)?.label || op;
}

// شرط‌های آماده برای سؤالات گزینه‌ای و بله/خیر
// تک‌گزینه‌ای از EQUALS استفاده می‌کند تا امتیاز یک گزینه به گزینه‌های دیگر سرایت نکند.
function conditionsForQuestion(
  q: Question
): { value: string; label: string; operator: string }[] {
  if (q.type === "BOOLEAN") {
    return [
      { value: "true", label: "بله", operator: "IS_TRUE" },
      { value: "false", label: "خیر", operator: "IS_FALSE" },
    ];
  }
  const op = q.type === "MULTI_CHOICE" ? "CONTAINS" : "EQUALS";
  return (q.options || []).map((o) => ({
    value: o.value,
    label: o.label,
    operator: op,
  }));
}

// متن کوتاه شرط یک قانون عددی برای نمایش روی نشان
function ruleConditionText(rule: UnifiedRule): string {
  return `${operatorLabel(rule.operator)} ${rule.value ?? ""}`;
}

// آیکون نوع سؤال
function TypeIcon({ type }: { type: string }) {
  if (type === NUMBER_TYPE) return <Hash size={14} />;
  if (type === "LINK") return <Link2 size={14} />;
  if (type === "FILE_UPLOAD") return <Upload size={14} />;
  if (type === "BOOLEAN") return <ToggleLeft size={14} />;
  if (OPTION_TYPES.includes(type)) return <ListChecks size={14} />;
  return <Type size={14} />;
}

// نام فارسی نوع سؤال
function typeName(type: string): string {
  if (type === NUMBER_TYPE) return "عددی";
  if (type === "LINK") return "لینک";
  if (type === "FILE_UPLOAD") return "آپلود فایل";
  if (type === "BOOLEAN") return "بله/خیر";
  if (OPTION_TYPES.includes(type)) return "گزینه‌ای";
  return "متنی";
}

// ============================================================================
// تب قوانین — پنل مدیریت درجا: هر سؤال یک کارت مستقل با قوانین خودش
// ============================================================================
export default function RulesTab({
  jobId,
  questions,
}: {
  jobId: string;
  questions: Question[];
}) {
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [rejectionRules, setRejectionRules] = useState<RejectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // بارگذاری همه‌ی قوانین
  const loadRules = useCallback(async () => {
    setError(null);
    try {
      const scoringLists = await Promise.all(
        questions.map((q) =>
          rulesApi
            .listScoring(jobId, q.id)
            .then((res) => res.rules as ScoringRule[])
            .catch(() => [] as ScoringRule[])
        )
      );
      setScoringRules(scoringLists.flat());
      const rejRes = await rulesApi.listRejection(jobId);
      setRejectionRules(rejRes.rules as RejectionRule[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در دریافت قوانین.");
    } finally {
      setLoading(false);
    }
  }, [jobId, questions]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // قوانین یکپارچه‌ی یک سؤال (امتیاز + رد)
  function rulesForQuestion(qId: string): UnifiedRule[] {
    const s: UnifiedRule[] = scoringRules
      .filter((r) => r.questionId === qId)
      .map((r) => ({
        kind: "score",
        id: r.id,
        operator: r.operator,
        value: r.value,
        points: r.points,
      }));
    const j: UnifiedRule[] = rejectionRules
      .filter((r) => r.questionId === qId)
      .map((r) => ({
        kind: "reject",
        id: r.id,
        operator: r.operator,
        value: r.value,
        points: null,
      }));
    return [...s, ...j];
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
        ابتدا در تب «طراحی فرم استخدام» چند سؤال بسازید، سپس برای هر سؤال قانون
        امتیاز و رد تعریف کنید.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {/* راهنما */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-700">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          برای هر سؤال، درون کارت خودش قانون تعریف کنید. می‌توانید «امتیاز مثبت»
          بدهید یا «رد خودکار» را فعال کنید. قوانین رد ابتدا بررسی می‌شوند و سپس
          امتیازها جمع می‌شوند.
        </span>
      </div>

      {/* یک کارت برای هر سؤال */}
      {questions.map((q) => (
        <QuestionRuleCard
          key={q.id}
          jobId={jobId}
          question={q}
          rules={rulesForQuestion(q.id)}
          reload={loadRules}
        />
      ))}
    </div>
  );
}

// ============================================================================
// کارت قوانین یک سؤال — بر اساس نوع سؤال، بیلدر مناسب را نشان می‌دهد
// ============================================================================
function QuestionRuleCard({
  jobId,
  question,
  rules,
  reload,
}: {
  jobId: string;
  question: Question;
  rules: UnifiedRule[];
  reload: () => Promise<void>;
}) {
  const isNumber = question.type === NUMBER_TYPE;
  const isOption = OPTION_TYPES.includes(question.type);
  const isKeyword = KEYWORD_TYPES.includes(question.type);
  const isPresence = PRESENCE_TYPES.includes(question.type);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* هدر کارت */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <TypeIcon type={question.type} />
          {typeName(question.type)}
        </span>
        <h3 className="font-bold text-slate-800">{question.label}</h3>
      </div>

      {/* بیلدر متناسب با نوع سؤال */}
      {isNumber && (
        <NumberBuilder jobId={jobId} question={question} reload={reload} />
      )}
      {isKeyword && (
        <KeywordBuilder
          jobId={jobId}
          question={question}
          rules={rules}
          reload={reload}
        />
      )}
      {isOption && (
        <OptionBuilder
          jobId={jobId}
          question={question}
          rules={rules}
          reload={reload}
        />
      )}
      {isPresence && (
        <PresenceBuilder
          jobId={jobId}
          question={question}
          rules={rules}
          reload={reload}
        />
      )}

      {/* قوانین موجود برای انواع عددی (بقیه انواع نشان‌ها را داخل بیلدر خودشان دارند) */}
      {isNumber && rules.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {rules.map((rule) => (
            <RuleBadge key={rule.id} jobId={jobId} rule={rule} reload={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// انتخابگر اکشن: دو دکمه «امتیاز مثبت» / «رد خودکار»
// ============================================================================
function ActionToggle({
  action,
  setAction,
}: {
  action: ActionType;
  setAction: (a: ActionType) => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => setAction("score")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          action === "score"
            ? "bg-emerald-500 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        امتیاز مثبت
      </button>
      <button
        type="button"
        onClick={() => setAction("reject")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          action === "reject"
            ? "bg-red-500 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        رد خودکار
      </button>
    </div>
  );
}

// ============================================================================
// بیلدر سؤال عددی
// ============================================================================
function NumberBuilder({
  jobId,
  question,
  reload,
}: {
  jobId: string;
  question: Question;
  reload: () => Promise<void>;
}) {
  const [operator, setOperator] = useState("GREATER_OR_EQUAL");
  const [value, setValue] = useState("");
  const [action, setAction] = useState<ActionType>("score");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value.trim()) {
      setError("عدد مرجع را وارد کنید.");
      return;
    }
    if (action === "score" && (points === "" || Number.isNaN(Number(points)))) {
      setError("امتیاز را به‌صورت عدد وارد کنید.");
      return;
    }
    setBusy(true);
    try {
      if (action === "score") {
        await rulesApi.addScoring(jobId, question.id, {
          operator,
          value: value.trim(),
          points: Number(points),
          label: `${operatorLabel(operator)} ${value.trim()}`,
        });
      } else {
        await rulesApi.addRejection(jobId, {
          questionId: question.id,
          operator,
          value: value.trim(),
          reason:
            reason || `${question.label} ${operatorLabel(operator)} ${value.trim()}`,
        });
      }
      setValue("");
      setPoints("");
      setReason("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ثبت قانون.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
    >
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">عملگر</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {operatorsForQuestionType("NUMBER").map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">عدد مرجع</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="مثلاً 5"
            className="w-28 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <ActionToggle action={action} setAction={setAction} />
        {action === "score" ? (
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="امتیاز"
            className="w-28 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        ) : (
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل رد (اختیاری)"
            className="w-48 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          افزودن
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// بیلدر سؤالات متنی — چند کلمه کلیدی مستقل (با ویرایش/حذف درجا)
// ============================================================================
function KeywordBuilder({
  jobId,
  question,
  rules,
  reload,
}: {
  jobId: string;
  question: Question;
  rules: UnifiedRule[];
  reload: () => Promise<void>;
}) {
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState<ActionType>("score");
  const [points, setPoints] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keyword.trim()) {
      setError("یک کلمه کلیدی وارد کنید.");
      return;
    }
    if (action === "score" && (points === "" || Number.isNaN(Number(points)))) {
      setError("برای این کلمه کلیدی یک امتیاز عددی وارد کنید.");
      return;
    }
    setBusy(true);
    try {
      if (action === "score") {
        await rulesApi.addScoring(jobId, question.id, {
          operator: "CONTAINS",
          value: keyword.trim(),
          points: Number(points),
          label: keyword.trim(),
        });
      } else {
        await rulesApi.addRejection(jobId, {
          questionId: question.id,
          operator: "CONTAINS",
          value: keyword.trim(),
          reason: `شامل «${keyword.trim()}»`,
        });
      }
      setKeyword("");
      setPoints("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در افزودن کلمه کلیدی.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      {/* نشان‌های کلمات کلیدی ثبت‌شده */}
      {rules.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {rules.map((rule) => (
            <KeywordBadge key={rule.id} jobId={jobId} rule={rule} reload={reload} />
          ))}
        </div>
      )}

      {/* فرم افزودن کلمه کلیدی */}
      <form onSubmit={addKeyword} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="کلمه کلیدی (مثلاً React)"
            className="w-52 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <ActionToggle action={action} setAction={setAction} />
          {action === "score" && (
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="امتیاز"
              className="w-28 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            افزودن
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// نشان یک کلمه کلیدی — با ویرایش و حذف درجا
// ============================================================================
function KeywordBadge({
  jobId,
  rule,
  reload,
}: {
  jobId: string;
  rule: UnifiedRule;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [keyword, setKeyword] = useState(rule.value ?? "");
  const [points, setPoints] = useState(rule.points != null ? String(rule.points) : "");
  const [busy, setBusy] = useState(false);

  const isScore = rule.kind === "score";

  async function save() {
    if (!keyword.trim()) return;
    setBusy(true);
    try {
      if (isScore) {
        await rulesApi.updateScoring(jobId, rule.id, {
          value: keyword.trim(),
          points: points === "" ? 0 : Number(points),
        });
      } else {
        await rulesApi.updateRejection(jobId, rule.id, {
          value: keyword.trim(),
          reason: `شامل «${keyword.trim()}»`,
        });
      }
      setEditing(false);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در ویرایش.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("این کلمه کلیدی حذف شود؟")) return;
    setBusy(true);
    try {
      if (isScore) await rulesApi.deleteScoring(jobId, rule.id);
      else await rulesApi.deleteRejection(jobId, rule.id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در حذف.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white p-1">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
        />
        {isScore && (
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="امتیاز"
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
          />
        )}
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
          title="ذخیره"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          title="انصراف"
        >
          <X size={13} />
        </button>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
        isScore
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-red-100 bg-red-50 text-red-700"
      }`}
    >
      <span className="font-medium">{rule.value}</span>
      <span className="opacity-70">|</span>
      <span className="font-bold">
        {isScore ? `+${rule.points} امتیاز` : "رد خودکار"}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="rounded p-0.5 opacity-70 transition hover:opacity-100"
        title="ویرایش"
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded p-0.5 opacity-70 transition hover:opacity-100 disabled:opacity-40"
        title="حذف"
      >
        <Trash2 size={12} />
      </button>
    </span>
  );
}

// ============================================================================
// بیلدر سؤالات گزینه‌ای / بله‌خیر — هر گزینه یک فرم مستقل
// ============================================================================
// امتیاز و وضعیت ردِ هر گزینه در یک استیت شیء‌گرا (optionRules) نگه داشته می‌شود
// که با کلید ترکیبی `${questionId}-${optionIndex}` مقید شده است. کارفرما می‌تواند
// برای هر گزینه وزنِ مستقل و متفاوت تعریف کند و تغییر مقدار یک گزینه هیچ اثری روی
// مقدار یا استایل گزینه‌های دیگر ندارد.
function OptionBuilder({
  jobId,
  question,
  rules,
  reload,
}: {
  jobId: string;
  question: Question;
  rules: UnifiedRule[];
  reload: () => Promise<void>;
}) {
  const conditions = conditionsForQuestion(question);
  const isBoolean = question.type === "BOOLEAN";

  // استیت مستقل هر گزینه — کلید هر گزینه: `${questionId}-opt-${optionIndex}`.
  // هر گزینه امتیاز و وضعیت ردِ جداگانه‌ی خود را دارد و هیچ تداخلی با بقیه ندارد.
  const [optionRules, setOptionRules] = useState<
    Record<string, { points: string; isReject: boolean }>
  >({});
  // گزینه‌ی انتخاب‌شده‌ی رادیویی هر سؤال (فقط برای نمایش تک‌انتخابی)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (conditions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        این سؤال گزینه‌ای ندارد.
      </div>
    );
  }

  const draftOf = (key: string) =>
    optionRules[key] || { points: "", isReject: false };

  // انتخاب رادیویی یک گزینه (فقط وضعیت انتخاب همین سؤال را عوض می‌کند)
  function handleSelectAnswer(questionId: string, optionIndex: number) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  // به‌روزرسانی فقط یک فیلد از کلید همین گزینه (بقیه‌ی کلیدها دست‌نخورده می‌مانند)
  function handleOptionRuleChange(
    questionId: string,
    optionIndex: number,
    field: "points" | "isReject",
    value: string | boolean
  ) {
    const key = `${questionId}-opt-${optionIndex}`;
    setOptionRules((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { points: "", isReject: false }),
        [field]: value,
      },
    }));
  }

  async function submitOption(
    optionIndex: number,
    cond: { value: string; label: string; operator: string }
  ) {
    const key = `${question.id}-opt-${optionIndex}`;
    const rule = draftOf(key);
    const needsValue = !NO_VALUE_OPERATORS.includes(cond.operator);

    if (!rule.isReject && (rule.points === "" || Number.isNaN(Number(rule.points)))) {
      alert("برای این گزینه یک امتیاز عددی وارد کنید یا «رد خودکار» را انتخاب کنید.");
      return;
    }

    setBusyKey(key);
    try {
      if (rule.isReject) {
        await rulesApi.addRejection(jobId, {
          questionId: question.id,
          operator: cond.operator,
          value: needsValue ? cond.value : undefined,
          reason: `${question.label}: ${cond.label}`,
        });
      } else {
        await rulesApi.addScoring(jobId, question.id, {
          operator: cond.operator,
          value: needsValue ? cond.value : undefined,
          points: Number(rule.points),
          label: cond.label,
        });
      }
      // ریست فقط همین کلید (بقیه‌ی گزینه‌ها بدون تغییر می‌مانند)
      setOptionRules((prev) => ({
        ...prev,
        [key]: { points: "", isReject: false },
      }));
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در ثبت قانون.");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeRule(rule: UnifiedRule) {
    if (!confirm("این قانون حذف شود؟")) return;
    try {
      if (rule.kind === "score") await rulesApi.deleteScoring(jobId, rule.id);
      else await rulesApi.deleteRejection(jobId, rule.id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در حذف.");
    }
  }

  // نشان‌های قانونِ ثبت‌شده‌ی یک گزینه (مشترک بین دو حالت)
  function renderSavedBadges(optRules: UnifiedRule[]) {
    if (optRules.length === 0) return null;
    return (
      <>
        {optRules.map((rule) => (
          <span
            key={rule.id}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
              rule.kind === "score"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-red-100 bg-red-50 text-red-700"
            }`}
          >
            {rule.kind === "score" ? `+${rule.points} امتیاز` : "رد خودکار"}
            <button
              onClick={() => removeRule(rule)}
              className="opacity-70 transition hover:opacity-100"
              title="حذف"
            >
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </>
    );
  }

  // فیلترِ قوانین یک گزینه
  const rulesOfOption = (cond: { value: string; operator: string }) =>
    rules.filter((r) => {
      if (cond.operator === "IS_TRUE") return r.operator === "IS_TRUE";
      if (cond.operator === "IS_FALSE") return r.operator === "IS_FALSE";
      return r.value === cond.value;
    });

  // ==========================================================================
  // حالت بله/خیر — بدون تغییر (چیدمان قبلی که درست کار می‌کند)
  // ==========================================================================
  if (isBoolean) {
    return (
      <div className="space-y-2">
        {conditions.map((cond, optIndex) => {
          const key = `${question.id}-opt-${optIndex}`;
          const currentRule = optionRules[key] || { points: "", isReject: false };
          const optRules = rulesOfOption(cond);

          return (
            <div
              key={optIndex}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                  {cond.label}
                </span>
                {renderSavedBadges(optRules)}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleOptionRuleChange(question.id, optIndex, "isReject", false)
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      !currentRule.isReject
                        ? "bg-emerald-500 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    امتیاز مثبت
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleOptionRuleChange(question.id, optIndex, "isReject", true)
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      currentRule.isReject
                        ? "bg-red-500 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    رد خودکار
                  </button>
                </div>

                {!currentRule.isReject && (
                  <input
                    type="number"
                    value={currentRule.points || ""}
                    onChange={(e) =>
                      handleOptionRuleChange(
                        question.id,
                        optIndex,
                        "points",
                        e.target.value
                      )
                    }
                    placeholder="امتیاز"
                    className="w-28 rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                )}

                <button
                  type="button"
                  onClick={() => submitOption(optIndex, cond)}
                  disabled={busyKey === key}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {busyKey === key ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  افزودن
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ==========================================================================
  // حالت چندگزینه‌ای — رندر رادیویی و کاملاً ایزوله
  // ==========================================================================
  return (
    <div className="space-y-2">
      {conditions.map((cond, optIndex) => {
        const optionUniqueId = `radio-mc-${question.id}-${optIndex}`;
        const ruleKey = `${question.id}-opt-${optIndex}`;
        const currentRule = optionRules[ruleKey] || { points: "", isReject: false };
        const optRules = rulesOfOption(cond);

        return (
          <div
            key={optIndex}
            className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"
          >
            {/* نشان‌های قانونِ ثبت‌شده‌ی همین گزینه */}
            {optRules.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">{renderSavedBadges(optRules)}</div>
            )}

            <div className="flex items-center justify-between gap-2">
              {/* رادیو + برچسب گزینه */}
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id={optionUniqueId}
                  name={`mc-group-${question.id}`}
                  checked={selectedAnswers[question.id] === optIndex}
                  onChange={() => handleSelectAnswer(question.id, optIndex)}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor={optionUniqueId}
                  className="cursor-pointer text-sm font-medium text-slate-700"
                >
                  {cond.label}
                </label>
              </div>

              {/* بخش امتیازدهی کارفرما */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="امتیاز"
                  value={currentRule.points || ""}
                  onChange={(e) =>
                    handleOptionRuleChange(
                      question.id,
                      optIndex,
                      "points",
                      e.target.value
                    )
                  }
                  className="w-20 rounded border border-slate-300 p-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-brand-500"
                />
                {/* دکمه رد خودکار مربوط به همین گزینه */}
                <button
                  type="button"
                  onClick={() =>
                    handleOptionRuleChange(
                      question.id,
                      optIndex,
                      "isReject",
                      !currentRule.isReject
                    )
                  }
                  className={`rounded border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    currentRule.isReject
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {currentRule.isReject ? "❌ رد خودکار" : "رد خودکار"}
                </button>
                {/* ثبت قانونِ همین گزینه */}
                <button
                  type="button"
                  onClick={() => submitOption(optIndex, cond)}
                  disabled={busyKey === ruleKey}
                  className="inline-flex items-center gap-1 rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {busyKey === ruleKey ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  ثبت
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// بیلدر سؤالات لینک / آپلود فایل — منطق ساده‌ی صفر و یکی (ارسال / عدم ارسال)
// ============================================================================
function PresenceBuilder({
  jobId,
  question,
  rules,
  reload,
}: {
  jobId: string;
  question: Question;
  rules: UnifiedRule[];
  reload: () => Promise<void>;
}) {
  const [points, setPoints] = useState("");
  const [busyScore, setBusyScore] = useState(false);
  const [busyReject, setBusyReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noun = question.type === "FILE_UPLOAD" ? "فایل" : "لینک";

  // قانون امتیاز «در صورت ارسال» = NOT_EQUALS "" (پاسخ خالی نباشد)
  const provideRule = rules.find(
    (r) => r.kind === "score" && r.operator === "NOT_EQUALS"
  );
  // قانون رد «در صورت عدم ارسال» = EQUALS "" (پاسخ خالی باشد)
  const emptyRule = rules.find(
    (r) => r.kind === "reject" && r.operator === "EQUALS"
  );

  async function addProvideScore() {
    setError(null);
    if (points === "" || Number.isNaN(Number(points))) {
      setError("یک امتیاز عددی وارد کنید.");
      return;
    }
    setBusyScore(true);
    try {
      await rulesApi.addScoring(jobId, question.id, {
        operator: "NOT_EQUALS",
        value: "",
        points: Number(points),
        label: `در صورت ارسال ${noun}`,
      });
      setPoints("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ثبت قانون.");
    } finally {
      setBusyScore(false);
    }
  }

  async function addEmptyReject() {
    setBusyReject(true);
    try {
      await rulesApi.addRejection(jobId, {
        questionId: question.id,
        operator: "EQUALS",
        value: "",
        reason: `عدم ارسال ${noun}`,
      });
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در ثبت قانون.");
    } finally {
      setBusyReject(false);
    }
  }

  async function removeRule(rule: UnifiedRule) {
    if (!confirm("این قانون حذف شود؟")) return;
    try {
      if (rule.kind === "score") await rulesApi.deleteScoring(jobId, rule.id);
      else await rulesApi.deleteRejection(jobId, rule.id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در حذف.");
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {/* ردیف ۱: در صورت ارسال → امتیاز */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 border border-slate-100">
        <span className="text-xs font-medium text-slate-700">
          در صورت ارسال {noun}:
        </span>
        {provideRule ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
            <span className="font-bold">+{provideRule.points} امتیاز</span>
            <button
              onClick={() => removeRule(provideRule)}
              className="opacity-70 transition hover:opacity-100"
              title="حذف"
            >
              <Trash2 size={12} />
            </button>
          </span>
        ) : (
          <>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="امتیاز"
              className="w-24 rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={addProvideScore}
              disabled={busyScore}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busyScore ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              ثبت امتیاز
            </button>
          </>
        )}
      </div>

      {/* ردیف ۲: در صورت عدم ارسال → رد خودکار */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 border border-slate-100">
        <span className="text-xs font-medium text-slate-700">
          در صورت عدم ارسال {noun}:
        </span>
        {emptyRule ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs text-red-700">
            <span className="font-bold">رد خودکار</span>
            <button
              onClick={() => removeRule(emptyRule)}
              className="opacity-70 transition hover:opacity-100"
              title="حذف"
            >
              <Trash2 size={12} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={addEmptyReject}
            disabled={busyReject}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busyReject ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            فعال‌سازی رد خودکار
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// نشان یک قانون عددی — حذف درجا
// ============================================================================
function RuleBadge({
  jobId,
  rule,
  reload,
}: {
  jobId: string;
  rule: UnifiedRule;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const isScore = rule.kind === "score";

  async function remove() {
    if (!confirm("این قانون حذف شود؟")) return;
    setBusy(true);
    try {
      if (isScore) await rulesApi.deleteScoring(jobId, rule.id);
      else await rulesApi.deleteRejection(jobId, rule.id);
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در حذف.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
        isScore
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-red-100 bg-red-50 text-red-700"
      }`}
    >
      <span className="font-medium">{ruleConditionText(rule)}</span>
      <span className="opacity-70">|</span>
      <span className="font-bold">
        {isScore ? `+${rule.points} امتیاز` : "رد خودکار"}
      </span>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded p-0.5 opacity-70 transition hover:opacity-100 disabled:opacity-40"
        title="حذف"
      >
        <Trash2 size={12} />
      </button>
    </span>
  );
}
