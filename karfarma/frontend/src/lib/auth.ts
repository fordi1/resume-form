// ============================================================================
// مدیریت توکن ورود در سمت مرورگر
// ============================================================================
// توکن را در localStorage نگه می‌داریم تا با رفرش صفحه پاک نشود.
// این توابع فقط در مرورگر کار می‌کنند (نه در سمت سرور Next.js).
// ============================================================================

import type { Employer } from "./api";

const TOKEN_KEY = "auth_token";
const EMPLOYER_KEY = "auth_employer";

// ذخیره توکن و اطلاعات کارفرما بعد از ورود/ثبت‌نام
export function saveAuth(token: string, employer: Employer) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMPLOYER_KEY, JSON.stringify(employer));
}

// خواندن توکن ذخیره‌شده
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// خواندن اطلاعات کارفرمای ذخیره‌شده
export function getEmployer(): Employer | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(EMPLOYER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Employer;
  } catch (_) {
    return null;
  }
}

// آیا کاربر وارد شده است؟
export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

// خروج — پاک کردن توکن
export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMPLOYER_KEY);
}
