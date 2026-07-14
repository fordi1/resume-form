// ============================================================================
// سرویس ارتباط با بک‌اند
// ============================================================================
// تمام درخواست‌ها به API از این فایل عبور می‌کنند تا مدیریت یکپارچه باشد.
// آدرس بک‌اند از متغیر محیطی NEXT_PUBLIC_API_URL خوانده می‌شود (فایل .env.local).
// ============================================================================

import { getToken } from "./auth";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

// با API_URL خالی، مسیر نسبی روی دامنه فعلی ساخته می‌شود؛ در صورت تنظیم متغیر
// محیطی نیز اسلش‌های ابتدا و انتها نرمال می‌شوند تا // ناخواسته ایجاد نشود.
function buildApiUrl(path: string): string {
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
}

// نوع خطای API برای مدیریت بهتر پیام‌ها
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// درخواست پایه — متد، مسیر، بدنه و توکن اختیاری می‌گیرد
async function request<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    token?: string | null;
  } = {}
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // خطای شبکه (مثلاً بک‌اند خاموش است)
    throw new ApiError("ارتباط با سرور برقرار نشد. آیا بک‌اند روشن است؟", 0);
  }

  // تلاش برای خواندن پاسخ JSON
  let data: any = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.message) || "خطایی رخ داد.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}

// ---- انواع پاسخ احراز هویت ----
export interface Employer {
  id: string;
  email: string;
  fullName?: string | null;
  company?: string | null;
  phone?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  employer: Employer;
}

// ============================================================================
// توابع احراز هویت
// ============================================================================

export const authApi = {
  // ثبت‌نام کارفرما
  register(payload: {
    email: string;
    password: string;
    fullName?: string;
    company?: string;
    phone?: string;
  }) {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  // ورود کارفرما
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  // گرفتن پروفایل کارفرمای واردشده (نیاز به توکن)
  me(token: string) {
    return request<{ employer: Employer }>("/api/auth/me", {
      method: "GET",
      token,
    });
  },

  // درخواست بازیابی رمز — توکن بازیابی برمی‌گرداند (شبیه‌سازی ایمیل)
  forgotPassword(email: string) {
    return request<{ message: string; resetToken?: string; expiresInMinutes?: number }>(
      "/api/auth/forgot-password",
      { method: "POST", body: { email } }
    );
  },

  // تنظیم رمز جدید با توکن
  resetPassword(token: string, password: string) {
    return request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: { token, password },
    });
  },
};

// ============================================================================
// درخواست محافظت‌شده — توکن را به‌صورت خودکار از localStorage می‌خواند
// ============================================================================
function authedRequest<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const token = getToken();
  return request<T>(path, { ...options, token });
}

// ============================================================================
// انواع مربوط به موقعیت شغلی و فرم
// ============================================================================
export const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "تمام‌وقت" },
  { value: "PART_TIME", label: "پاره‌وقت" },
  { value: "REMOTE", label: "دورکاری" },
  { value: "CONTRACT", label: "قراردادی" },
  { value: "INTERNSHIP", label: "کارآموزی" },
];

// شش نوع سؤال مجاز برای طراحی فرم استخدام
export const QUESTION_TYPES = [
  { value: "SHORT_TEXT", label: "متنی" },
  { value: "NUMBER", label: "عددی" },
  { value: "SINGLE_CHOICE", label: "گزینه‌ای" },
  { value: "BOOLEAN", label: "بله / خیر" },
  { value: "LINK", label: "لینک" },
  { value: "FILE_UPLOAD", label: "آپلود فایل" },
];

export interface Job {
  id: string;
  title: string;
  description?: string | null;
  requiredSkills: string[];
  minExperience?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  employmentType?: string | null;
  location?: string | null;
  isActive: boolean;
  slug: string;
  createdAt: string;
  _count?: { applications: number; questions: number };
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  type: string;
  label: string;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  options: QuestionOption[];
  fieldKey?: string | null;
}

// ============================================================================
// توابع موقعیت‌های شغلی
// ============================================================================
export const jobsApi = {
  // لیست شغل‌های کارفرما
  list() {
    return authedRequest<{ jobs: Job[] }>("/api/jobs");
  },

  // مشاهده یک شغل (+ فرم و سؤالات)
  get(id: string) {
    return authedRequest<{ job: Job & { questions?: Question[] } }>(
      `/api/jobs/${id}`
    );
  },

  // ساخت شغل جدید
  create(payload: {
    title: string;
    description?: string;
    requiredSkills?: string[] | string;
    minExperience?: number;
    salaryMin?: number;
    salaryMax?: number;
    employmentType?: string;
    location?: string;
  }) {
    return authedRequest<{ message: string; applyUrl: string; job: Job }>(
      "/api/jobs",
      { method: "POST", body: payload }
    );
  },

  // ویرایش شغل
  update(id: string, payload: Partial<Job>) {
    return authedRequest<{ message: string; job: Job }>(`/api/jobs/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  // فعال/غیرفعال کردن
  toggle(id: string) {
    return authedRequest<{ message: string; job: Job }>(
      `/api/jobs/${id}/toggle`,
      { method: "PATCH" }
    );
  },

  // حذف شغل
  remove(id: string) {
    return authedRequest<{ message: string }>(`/api/jobs/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================================================
// توابع فرم و سؤالات
// ============================================================================
export const formApi = {
  // مشاهده فرم و سؤالات یک شغل
  getForm(jobId: string) {
    return authedRequest<{ form: any; questions: Question[] }>(
      `/api/jobs/${jobId}/form`
    );
  },

  // افزودن سؤال
  addQuestion(
    jobId: string,
    payload: {
      type: string;
      label: string;
      helpText?: string;
      isRequired?: boolean;
      order?: number;
      options?: QuestionOption[];
      fieldKey?: string;
    }
  ) {
    return authedRequest<{ message: string; question: Question }>(
      `/api/jobs/${jobId}/questions`,
      { method: "POST", body: payload }
    );
  },

  // ویرایش سؤال
  updateQuestion(jobId: string, questionId: string, payload: Partial<Question>) {
    return authedRequest<{ message: string; question: Question }>(
      `/api/jobs/${jobId}/questions/${questionId}`,
      { method: "PUT", body: payload }
    );
  },

  // حذف سؤال
  deleteQuestion(jobId: string, questionId: string) {
    return authedRequest<{ message: string }>(
      `/api/jobs/${jobId}/questions/${questionId}`,
      { method: "DELETE" }
    );
  },

  // تغییر ترتیب سؤالات — order آرایه‌ای از شناسه‌هاست
  reorder(jobId: string, order: string[]) {
    return authedRequest<{ message: string; questions: Question[] }>(
      `/api/jobs/${jobId}/questions/reorder`,
      { method: "PUT", body: { order } }
    );
  },
};

// عملگرهای قابل استفاده در قوانین (هماهنگ با موتور ارزیابی بک‌اند)
export const RULE_OPERATORS = [
  { value: "EQUALS", label: "برابر است با" },
  { value: "NOT_EQUALS", label: "برابر نیست با" },
  { value: "CONTAINS", label: "شامل است" },
  { value: "IN", label: "یکی از موارد" },
  { value: "GREATER_THAN", label: "بزرگ‌تر از" },
  { value: "GREATER_OR_EQUAL", label: "بزرگ‌تر یا مساوی" },
  { value: "LESS_THAN", label: "کوچک‌تر از" },
  { value: "LESS_OR_EQUAL", label: "کوچک‌تر یا مساوی" },
  { value: "IS_TRUE", label: "بله باشد" },
  { value: "IS_FALSE", label: "خیر باشد" },
];

// عملگرهایی که نیازی به مقدار مرجع ندارند
export const NO_VALUE_OPERATORS = ["IS_TRUE", "IS_FALSE"];

// ----------------------------------------------------------------------------
// عملگرهای مناسب هر نوع سؤال
// ----------------------------------------------------------------------------
// بر اساس نوع سؤال فقط عملگرهای معنادار نمایش داده می‌شوند:
//   - سؤال عددی  → حداقل/حداکثر/بزرگ‌تر/کوچک‌تر/برابر
//   - سؤال متنی  → شامل باشد/برابر/نابرابر
//   - تک‌گزینه‌ای → برابر/نابرابر/یکی از موارد
//   - چندگزینه‌ای→ شامل باشد/یکی از موارد
//   - بله/خیر    → بله باشد/خیر باشد
export function operatorsForQuestionType(
  type?: string | null
): { value: string; label: string }[] {
  switch (type) {
    case "NUMBER":
      return [
        { value: "GREATER_OR_EQUAL", label: "حداقل (بزرگ‌تر یا مساوی ≥)" },
        { value: "LESS_OR_EQUAL", label: "حداکثر (کوچک‌تر یا مساوی ≤)" },
        { value: "GREATER_THAN", label: "بزرگ‌تر از (>)" },
        { value: "LESS_THAN", label: "کوچک‌تر از (<)" },
        { value: "EQUALS", label: "برابر با" },
      ];
    case "SHORT_TEXT":
    case "LONG_TEXT":
    case "LINK":
      return [
        { value: "CONTAINS", label: "شامل باشد" },
        { value: "EQUALS", label: "برابر با" },
        { value: "NOT_EQUALS", label: "برابر نباشد" },
      ];
    case "SINGLE_CHOICE":
      return [
        { value: "EQUALS", label: "برابر با" },
        { value: "NOT_EQUALS", label: "برابر نباشد" },
        { value: "IN", label: "یکی از موارد" },
      ];
    case "MULTI_CHOICE":
      return [
        { value: "CONTAINS", label: "شامل باشد" },
        { value: "IN", label: "یکی از موارد" },
      ];
    case "BOOLEAN":
      return [
        { value: "IS_TRUE", label: "بله باشد" },
        { value: "IS_FALSE", label: "خیر باشد" },
      ];
    case "FILE_UPLOAD":
      return [
        { value: "CONTAINS", label: "شامل باشد" },
        { value: "EQUALS", label: "برابر با" },
      ];
    default:
      // اگر سؤالی انتخاب نشده باشد، همه عملگرها در دسترس‌اند
      return RULE_OPERATORS;
  }
}

export interface ScoringRule {
  id: string;
  questionId: string;
  operator: string;
  value: string | null;
  points: number;
  label: string | null;
  isActive: boolean;
}

export interface RejectionRule {
  id: string;
  jobPositionId: string;
  questionId: string | null;
  operator: string;
  value: string | null;
  reason: string | null;
  isActive: boolean;
}

// ============================================================================
// توابع قوانین امتیازدهی و رد خودکار
// ============================================================================
export const rulesApi = {
  // قوانین امتیاز یک سؤال
  listScoring(jobId: string, questionId: string) {
    return authedRequest<{ rules: any[] }>(
      `/api/jobs/${jobId}/questions/${questionId}/scoring-rules`
    );
  },
  addScoring(
    jobId: string,
    questionId: string,
    payload: { operator: string; value?: string; points: number; label?: string }
  ) {
    return authedRequest<{ message: string; rule: any }>(
      `/api/jobs/${jobId}/questions/${questionId}/scoring-rules`,
      { method: "POST", body: payload }
    );
  },
  updateScoring(jobId: string, ruleId: string, payload: any) {
    return authedRequest<{ message: string; rule: any }>(
      `/api/jobs/${jobId}/scoring-rules/${ruleId}`,
      { method: "PUT", body: payload }
    );
  },
  deleteScoring(jobId: string, ruleId: string) {
    return authedRequest<{ message: string }>(
      `/api/jobs/${jobId}/scoring-rules/${ruleId}`,
      { method: "DELETE" }
    );
  },

  // قوانین رد خودکار یک شغل
  listRejection(jobId: string) {
    return authedRequest<{ rules: any[] }>(`/api/jobs/${jobId}/rejection-rules`);
  },
  addRejection(
    jobId: string,
    payload: { questionId?: string; operator: string; value?: string; reason?: string }
  ) {
    return authedRequest<{ message: string; rule: any }>(
      `/api/jobs/${jobId}/rejection-rules`,
      { method: "POST", body: payload }
    );
  },
  updateRejection(jobId: string, ruleId: string, payload: any) {
    return authedRequest<{ message: string; rule: any }>(
      `/api/jobs/${jobId}/rejection-rules/${ruleId}`,
      { method: "PUT", body: payload }
    );
  },
  deleteRejection(jobId: string, ruleId: string) {
    return authedRequest<{ message: string }>(
      `/api/jobs/${jobId}/rejection-rules/${ruleId}`,
      { method: "DELETE" }
    );
  },
};

// ============================================================================
// انواع مربوط به متقاضیان
// ============================================================================
export interface PublicFormQuestion {
  id: string;
  type: string;
  label: string;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  options: QuestionOption[];
}

export interface PublicForm {
  job: {
    id: string;
    title: string;
    description?: string | null;
    requiredSkills: string[];
    minExperience?: number | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    location?: string | null;
    employmentType?: string | null;
    slug: string;
  };
  form: { title?: string; description?: string } | null;
  questions: PublicFormQuestion[];
}

export interface ApplicantListItem {
  applicationId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  finalScore: number | null;
  category: string | null;
  status: string;
  hasResume: boolean;
  submittedAt: string;
  experience: number | null;
  skills: string[];
}

export interface ApplicantAnswer {
  questionId: string;
  label: string | null;
  type: string | null;
  value: any;
  earnedPoints: number | null;
}

export interface ApplicantDetail {
  applicationId: string;
  applicant: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
  status: string;
  finalScore: number | null;
  category: string | null;
  rejectionReason?: string | null;
  experience: number | null;
  skills: string[];
  submittedAt: string;
  resume: { fileName?: string; available: boolean };
  answers: ApplicantAnswer[];
  result: any;
}

// فیلترهای لیست متقاضیان
export interface ApplicantFilters {
  minScore?: string | number;
  maxScore?: string | number;
  status?: string;
  category?: string;
  skill?: string;
  skills?: string; // چند مهارت با ویرگول جدا شده
  minExperience?: string | number;
  fromDate?: string;
  toDate?: string;
  sort?: string;
}

// دسته‌بندی‌ها و وضعیت‌ها با برچسب فارسی
export const CATEGORY_LABELS: Record<string, string> = {
  EXCELLENT: "عالی",
  VERY_GOOD: "بسیار خوب",
  GOOD: "خوب",
  AVERAGE: "متوسط",
  REJECTED: "رد شده",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  UNDER_REVIEW: "در حال بررسی",
  SHORTLISTED: "منتخب",
  ACCEPTED: "تأییدشده",
  HIRED: "استخدام‌شده",
  REJECTED: "رد شده",
  REJECTED_AUTO: "رد خودکار",
};

// وضعیت‌هایی که کارفرما می‌تواند دستی تنظیم کند
export const MANUAL_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "ACCEPTED",
  "HIRED",
  "REJECTED",
];

// ============================================================================
// توابع متقاضی (بخش عمومی + بخش کارفرما)
// ============================================================================
export const applicationsApi = {
  // دریافت فرم عمومی بر اساس slug (بدون توکن)
  getPublicForm(slug: string) {
    return request<PublicForm>(`/api/applications/form/${slug}`);
  },

  // ارسال درخواست متقاضی به همراه فایل رزومه (multipart/form-data)
  async submit(
    slug: string,
    payload: {
      fullName: string;
      email?: string;
      phone?: string;
      experienceYears?: number | string;
      skills?: string[];
      answers: { questionId: string; value: any }[];
      resume?: File | null;
      // فایل‌های سؤالات آپلود فایل: نگاشت questionId → File
      questionFiles?: Record<string, File>;
    }
  ) {
    const form = new FormData();
    form.append("fullName", payload.fullName);
    if (payload.email) form.append("email", payload.email);
    if (payload.phone) form.append("phone", payload.phone);
    if (payload.experienceYears !== undefined && payload.experienceYears !== "")
      form.append("experienceYears", String(payload.experienceYears));
    form.append("skills", JSON.stringify(payload.skills || []));
    form.append("answers", JSON.stringify(payload.answers));
    if (payload.resume) form.append("resume", payload.resume);
    // هر فایل سؤال با نام فیلد `file_<questionId>` فرستاده می‌شود
    if (payload.questionFiles) {
      for (const [questionId, f] of Object.entries(payload.questionFiles)) {
        if (f) form.append(`file_${questionId}`, f);
      }
    }

    let response: Response;
    try {
      response = await fetch(buildApiUrl(`/api/applications/apply/${slug}`), {
        method: "POST",
        body: form, // Content-Type را خودِ مرورگر با boundary تنظیم می‌کند
      });
    } catch (err) {
      throw new ApiError("ارتباط با سرور برقرار نشد.", 0);
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
    if (!response.ok) {
      throw new ApiError((data && data.message) || "خطا در ثبت درخواست.", response.status);
    }
    return data as {
      message: string;
      applicationId: string;
      result: {
        decision: string;
        finalScore: number;
        category: string;
        rejectionReason?: string | null;
      };
    };
  },

  // لیست متقاضیان یک شغل + فیلترها (کارفرما)
  listApplicants(jobId: string, filters: ApplicantFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        params.append(key, String(val));
      }
    });
    const query = params.toString();
    return authedRequest<{
      job: {
        id: string;
        title: string;
        slug: string;
        maxPossibleScore: number;
        requiredSkills: string[];
        minExperience: number | null;
      };
      count: number;
      applicants: ApplicantListItem[];
    }>(`/api/admin/jobs/${jobId}/applicants${query ? `?${query}` : ""}`);
  },

  // جزئیات یک متقاضی (کارفرما)
  getApplicant(jobId: string, applicationId: string) {
    return authedRequest<ApplicantDetail>(
      `/api/admin/jobs/${jobId}/applicants/${applicationId}`
    );
  },

  // تغییر وضعیت متقاضی (کارفرما)
  updateStatus(jobId: string, applicationId: string, status: string) {
    return authedRequest<{ message: string; applicationId: string; status: string }>(
      `/api/admin/jobs/${jobId}/applicants/${applicationId}/status`,
      { method: "PATCH", body: { status } }
    );
  },

  // دانلود رزومه — چون مسیر محافظت‌شده است، با توکن فایل را می‌گیریم و ذخیره می‌کنیم
  async downloadResume(jobId: string, applicationId: string, fileName?: string) {
    const token = getToken();
    const res = await fetch(
      buildApiUrl(`/api/admin/jobs/${jobId}/applicants/${applicationId}/resume`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) {
      throw new ApiError("خطا در دانلود رزومه.", res.status);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "resume.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // دانلود فایلِ پاسخِ یک سؤالِ آپلود فایل (محافظت‌شده)
  async downloadAnswerFile(
    jobId: string,
    applicationId: string,
    questionId: string,
    fileName?: string
  ) {
    const token = getToken();
    const res = await fetch(
      buildApiUrl(
        `/api/admin/jobs/${jobId}/applicants/${applicationId}/answers/${questionId}/file`
      ),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) {
      throw new ApiError("خطا در دانلود فایل.", res.status);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export { request, authedRequest };
