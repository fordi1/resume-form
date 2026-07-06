"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // توکن از آدرس خوانده می‌شود؛ اگر نبود، کاربر می‌تواند دستی وارد کند
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("توکن بازیابی الزامی است.");
      return;
    }
    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      // بعد از چند ثانیه به صفحه ورود می‌رویم
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطای ناشناخته رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  // ---- صفحه موفقیت ----
  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-green-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            رمز عبور تغییر کرد!
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            اکنون با رمز جدید وارد می‌شوید... در حال انتقال به صفحه ورود.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ورود فوری
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* عنوان */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">تنظیم رمز جدید</h1>
        <p className="mt-2 text-sm text-slate-500">
          رمز عبور جدید خود را وارد کنید.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* توکن به‌صورت خودکار از URL خوانده می‌شود و به کاربر نمایش داده نمی‌شود */}

          {/* رمز جدید */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              رمز عبور جدید
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pr-10 pl-10 text-left outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* تکرار رمز */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              تکرار رمز عبور
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pr-10 pl-3 text-left outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                تنظیم رمز جدید
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          بازگشت به صفحه ورود
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <Suspense
        fallback={
          <Loader2 className="animate-spin text-brand-600" size={28} />
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </main>
  );
}
