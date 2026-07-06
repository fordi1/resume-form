import Link from "next/link";
import { LogIn, UserPlus, Briefcase } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
          <Briefcase size={30} />
        </div>

        <h1 className="text-3xl font-bold text-slate-800">
          سامانه ارزیابی متقاضیان استخدام
        </h1>
        <p className="mt-3 text-slate-500 leading-7">
          موقعیت‌های شغلی بسازید، فرم استخدام طراحی کنید و متقاضیان را به‌صورت
          خودکار امتیازدهی و دسته‌بندی کنید.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
          >
            <LogIn size={18} />
            ورود کارفرما
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <UserPlus size={18} />
            ثبت‌نام
          </Link>
        </div>
      </div>
    </main>
  );
}
