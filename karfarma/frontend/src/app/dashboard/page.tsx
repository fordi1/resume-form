"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Users,
  ListChecks,
  Power,
  Trash2,
  Pencil,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { jobsApi, ApiError, type Job } from "@/lib/api";
import CopyApplyLink from "@/components/CopyApplyLink";

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await jobsApi.list();
      setJobs(res.jobs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در دریافت شغل‌ها.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleToggle(id: string) {
    setBusyId(id);
    try {
      await jobsApi.toggle(id);
      await loadJobs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`آیا از حذف «${title}» مطمئن هستید؟ این کار قابل بازگشت نیست.`)) {
      return;
    }
    setBusyId(id);
    try {
      await jobsApi.remove(id);
      await loadJobs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "خطا در حذف شغل.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* سرصفحه */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">موقعیت‌های شغلی</h1>
          <p className="mt-1 text-sm text-slate-500">
            موقعیت‌های شغلی خود را بسازید و مدیریت کنید.
          </p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          ایجاد شغل جدید
        </Link>
      </div>

      {/* حالت‌ها */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ListChecks size={22} />
          </div>
          <p className="text-slate-600">هنوز موقعیت شغلی نساخته‌اید.</p>
          <Link
            href="/dashboard/jobs/new"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <Plus size={16} />
            اولین شغل خود را بسازید
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{job.title}</h3>
                  {job.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={13} />
                      {job.location}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    job.isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {job.isActive ? "فعال" : "غیرفعال"}
                </span>
              </div>

              {/* آمار */}
              <div className="mt-4 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {job._count?.applications ?? 0} متقاضی
                </span>
                <span className="flex items-center gap-1">
                  <ListChecks size={14} />
                  {job._count?.questions ?? 0} سؤال
                </span>
              </div>

              {/* لینک اختصاصی فرم استخدام (نسخه فشرده) */}
              <div className="mt-4">
                <CopyApplyLink slug={job.slug} compact />
              </div>

              {/* اکشن‌ها */}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  <Pencil size={14} />
                  مدیریت و فرم
                </Link>
                <button
                  onClick={() => handleToggle(job.id)}
                  disabled={busyId === job.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <Power size={14} />
                  {job.isActive ? "غیرفعال کردن" : "فعال کردن"}
                </button>
                <button
                  onClick={() => handleDelete(job.id, job.title)}
                  disabled={busyId === job.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
