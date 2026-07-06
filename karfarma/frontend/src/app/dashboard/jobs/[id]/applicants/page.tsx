"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// ============================================================================
// این صفحه به تب «بررسی متقاضیان» در پنل شغل منتقل شده است.
// برای سازگاری با لینک‌های قدیمی، کاربر را به همان تب هدایت می‌کنیم.
// ============================================================================
export default function ApplicantsRedirect() {
  const params = useParams();
  const router = useRouter();
  const jobId = String(params.id);

  useEffect(() => {
    router.replace(`/dashboard/jobs/${jobId}?tab=applicants`);
  }, [jobId, router]);

  return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-brand-600" size={28} />
    </div>
  );
}
