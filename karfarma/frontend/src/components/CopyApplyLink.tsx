"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";

// ============================================================================
// کامپوننت نمایش لینک اختصاصی فرم استخدام + دکمه کپی
// ============================================================================
// در دو حالت استفاده می‌شود:
//   - compact=false : نسخه کامل با کادر (برای هدر صفحه شغل)
//   - compact=true  : نسخه فشرده و کوچک (برای کارت‌های داشبورد)
// ============================================================================

export default function CopyApplyLink({
  slug,
  compact = false,
}: {
  slug: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  // ساخت آدرس کامل بر اساس دامنه فعلی
  const applyLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/apply/${slug}`
      : `/apply/${slug}`;

  function copyLink(e?: React.MouseEvent) {
    // جلوگیری از فعال شدن کلیک‌های والد (مثلاً وقتی روی کارت است)
    e?.preventDefault();
    e?.stopPropagation();
    navigator.clipboard.writeText(applyLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ---- نسخه فشرده (کارت داشبورد) ----
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-500"
        >
          {`/apply/${slug}`}
        </code>
        <button
          onClick={copyLink}
          title="کپی لینک"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? "کپی شد" : "کپی"}
        </button>
      </div>
    );
  }

  // ---- نسخه کامل (هدر صفحه شغل) ----
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-center gap-2 text-brand-800">
        <Link2 size={16} />
        <span className="text-sm font-medium">لینک اختصاصی فرم استخدام</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code
          dir="ltr"
          className="flex-1 truncate rounded-lg border border-brand-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
        >
          {applyLink}
        </code>
        <button
          onClick={copyLink}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "کپی شد" : "کپی"}
        </button>
      </div>
    </div>
  );
}
