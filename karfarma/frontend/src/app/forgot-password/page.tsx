"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Loader2, KeyRound, Send, CheckCircle2 } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // پیام موفقیت پس از ارسال ایمیل
  const [sent, setSent] = useState(false);
  // توکن — فقط اگر بک‌اند در حالت دمو توکن را برگرداند (اختیاری)
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("لطفاً ایمیل خود را وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      // اگر بک‌اند توکن را برگرداند (حالت دمو)، نگه می‌داریم؛
      // در حالت ایمیل واقعی، فقط پیام موفقیت نمایش داده می‌شود.
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطای ناشناخته رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  function goToReset() {
    if (resetToken) {
      router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* عنوان */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
            <KeyRound size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">فراموشی رمز عبور</h1>
          <p className="mt-2 text-sm text-slate-500">
            ایمیل حساب خود را وارد کنید تا لینک بازیابی ساخته شود.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
          {error && (
            <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 border border-amber-100">
              {error}
            </div>
          )}

          {/* پس از ارسال: پیام موفقیت «ایمیل ارسال شد» */}
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-500">
                <CheckCircle2 size={30} />
              </div>
              <p className="text-sm leading-7 text-slate-600">
                اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی رمز عبور برای شما
                ارسال شد. لطفاً صندوق ورودی (و پوشه اسپم) خود را بررسی کنید. لینک
                فقط ۱ ساعت اعتبار دارد.
              </p>

              {/* فقط در حالت دمو: اگر بک‌اند توکن را برگرداند، دکمه ادامه مستقیم */}
              {resetToken && (
                <button
                  onClick={goToReset}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  ادامه‌ی مستقیم (حالت تست)
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    دریافت لینک بازیابی
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            بازگشت به صفحه ورود
          </Link>
        </p>
      </div>
    </main>
  );
}
