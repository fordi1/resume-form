"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  ListChecks,
  Users,
  Pencil,
  SlidersHorizontal,
} from "lucide-react";
import { jobsApi, formApi, ApiError, type Job, type Question } from "@/lib/api";
import FormDesignerTab from "@/components/job/FormDesignerTab";
import ApplicantsTab from "@/components/job/ApplicantsTab";
import EditJobTab from "@/components/job/EditJobTab";
import RulesTab from "@/components/job/RulesTab";

type TabKey = "form" | "rules" | "applicants" | "edit";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "form", label: "طراحی فرم استخدام", icon: ListChecks },
  { key: "rules", label: "قوانین امتیازدهی و رد خودکار", icon: SlidersHorizontal },
  { key: "applicants", label: "بررسی متقاضیان", icon: Users },
  { key: "edit", label: "ویرایش شغل", icon: Pencil },
];

export default function JobPanelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = String(params.id);

  // تب فعال — از پارامتر ?tab= خوانده می‌شود (برای دیپ‌لینک)
  const initialTab = (searchParams.get("tab") as TabKey) || "form";
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : "form"
  );

  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const jobRes = await jobsApi.get(jobId);
      setJob(jobRes.job);
      const formRes = await formApi.getForm(jobId);
      setQuestions(formRes.questions.sort((a, b) => a.order - b.order));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowRight size={16} />
          بازگشت
        </Link>
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error || "شغل یافت نشد."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* هدر جمع‌وجور: دکمه بازگشت آیکونی + عنوان کوچک + وضعیت */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          title="بازگشت به داشبورد"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <ArrowRight size={16} />
        </Link>
        <h1 className="truncate text-base font-bold text-slate-800">
          {job.title}
        </h1>
        {job.location && (
          <span className="hidden text-xs text-slate-400 sm:inline">
            {job.location}
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            job.isActive
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {job.isActive ? "فعال" : "غیرفعال"}
        </span>
      </div>

      {/* تب‌ها */}
      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* محتوای تب فعال */}
      <div className="mt-6">
        {activeTab === "form" && (
          <FormDesignerTab
            jobId={jobId}
            questions={questions}
            setQuestions={setQuestions}
            reload={loadAll}
          />
        )}
        {activeTab === "rules" && (
          <RulesTab jobId={jobId} questions={questions} />
        )}
        {activeTab === "applicants" && <ApplicantsTab jobId={jobId} />}
        {activeTab === "edit" && <EditJobTab job={job} onUpdated={loadAll} />}
      </div>
    </div>
  );
}
