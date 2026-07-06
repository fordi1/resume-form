"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  Briefcase,
} from "lucide-react";
import { authApi, ApiError } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("ایمیل و رمز عبور الزامی است.");
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
    // اعتبارسنجی شماره تماس: اگر وارد شده باشد، باید با 09 شروع شده و ۱۱ رقم باشد
    if (phone && !/^09\d{9}$/.test(phone)) {
      setError("شماره تماس باید با 09 شروع شود و دقیقاً ۱۱ رقم باشد.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        email,
        password,
        fullName: fullName || undefined,
        company: company || undefined,
        phone: phone || undefined,
      });
      saveAuth(res.token, res.employer);
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "خطای ناشناخته رخ داد.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* لوگو و عنوان */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
            <Briefcase size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ثبت‌نام کارفرما</h1>
          <p className="mt-2 text-sm text-slate-500">
            برای شروع، یک حساب کاربری بسازید
          </p>
        </div>

        {/* کارت فرم */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* نام و نام خانوادگی */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                نام و نام خانوادگی
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثلاً الهه افضلی"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pr-10 pl-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* نام شرکت */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                نام شرکت
              </label>
              <div className="relative">
                <Building2
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="نام شرکت شما"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pr-10 pl-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* ایمیل */}
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

            {/* شماره تماس */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                شماره تماس
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => {
                    // فقط رقم بپذیر و حداکثر ۱۱ رقم
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPhone(digits);
                  }}
                  placeholder="09xxxxxxxxx"
                  maxLength={11}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pr-10 pl-3 text-left outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* رمز عبور */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                رمز عبور
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

            {/* تکرار رمز عبور */}
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

            {/* دکمه ثبت‌نام */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  در حال ثبت‌نام...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  ثبت‌نام
                </>
              )}
            </button>
          </form>
        </div>

        {/* لینک ورود */}
        <p className="mt-6 text-center text-sm text-slate-500">
          قبلاً حساب ساخته‌اید؟{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            وارد شوید
          </Link>
        </p>
      </div>
    </main>
  );
}
