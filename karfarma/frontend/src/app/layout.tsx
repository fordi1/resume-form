import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "سامانه ارزیابی متقاضیان استخدام",
  description: "سیستم مدیریت و ارزیابی متقاضیان استخدام",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
