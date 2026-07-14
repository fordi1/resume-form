"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Briefcase, Loader2 } from "lucide-react";
import { getEmployer, clearAuth, isLoggedIn } from "@/lib/auth";
import type { Employer } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setEmployer(getEmployer());
    setChecking(false);
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      {/* نوار بالا */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Briefcase size={18} />
            </div>
            <span className="font-bold text-slate-800">
              RTS <span className="font-normal text-slate-500">| پنل کارفرما</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {employer?.fullName && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                {employer.fullName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut size={16} />
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
