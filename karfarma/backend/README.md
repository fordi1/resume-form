# راه‌اندازی Backend

سیستم مدیریت و ارزیابی متقاضیان استخدام با Node.js، Express، Prisma و PostgreSQL.

## اجرای محلی

پیش‌نیازها: Node.js و یک PostgreSQL در دسترس. برای اجرای PostgreSQL با Docker:

```bash
docker compose up -d postgres
```

سپس فایل تنظیمات و دیتابیس را آماده کنید:

```bash
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
```

سرور را اجرا کنید:

```bash
npm run dev
```

سرور به‌طور پیش‌فرض در `http://localhost:4000` در دسترس است.

## تست دیتابیس

تست زیر CRUD، relation، transaction و cascade delete را مستقیماً روی PostgreSQL بررسی می‌کند و داده آزمایشی را در پایان پاک می‌کند:

```bash
npm run test:db
```

برای مشاهده داده‌ها می‌توانید `npx prisma studio` را اجرا کنید.

## تنظیم اتصال

Prisma مقدار `DATABASE_URL` را از `.env` می‌خواند. قالب آن:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

فیلدهای JSON و مقادیر قراردادی فعلاً از نوع `String` نگه داشته شده‌اند تا قرارداد API نسخه SQLite تغییر نکند.

## جدول‌های اصلی

| جدول | کاربرد |
|------|--------|
| `Employer` | کارفرما و احراز هویت |
| `JobPosition` | موقعیت شغلی و لینک اختصاصی |
| `Form` و `Question` | فرم استخدام و سؤالات |
| `ScoringRule` و `RejectionRule` | قوانین امتیازدهی و رد خودکار |
| `Applicant` و `Application` | متقاضی و درخواست استخدام |
| `Answer` | پاسخ‌های متقاضی |
| `AssessmentResult` | نتیجه ارزیابی |
