# RTS — Resume Tracking System

یک سامانه یکپارچه و فارسی برای ساخت موقعیت شغلی، طراحی فرم استخدام، دریافت رزومه و ارزیابی خودکار متقاضیان. کارفرما می‌تواند بدون تغییر کد، سؤال‌ها و قوانین امتیازدهی یا رد خودکار را تعریف کند و نتیجه هر درخواست را در پنل مدیریتی ببیند.

## قابلیت‌های اصلی

- ثبت‌نام، ورود و احراز هویت کارفرما با JWT
- بازیابی رمز عبور و ارسال لینک از طریق SMTP
- ایجاد، ویرایش، حذف و فعال/غیرفعال‌کردن موقعیت‌های شغلی
- تولید لینک عمومی اختصاصی برای هر فرصت شغلی
- فرم‌ساز با انواع سؤال متنی، عددی، چندگزینه‌ای، بولی، لینک و آپلود فایل
- مرتب‌سازی سؤال‌ها و مشخص‌کردن فیلدهای اجباری
- تعریف قوانین امتیازدهی پویا بدون هاردکدکردن امتیازها
- تعریف قوانین رد خودکار برای پاسخ‌های نامناسب
- موتور ارزیابی مستقل با دسته‌بندی نتایج از «متوسط» تا «عالی»
- دریافت رزومه PDF و فایل پاسخ سؤال‌ها تا سقف ۵ مگابایت
- فهرست، فیلتر و مشاهده جزئیات متقاضیان
- مشاهده جزئیات امتیازها و تغییر وضعیت درخواست استخدام
- رابط کاربری فارسی، راست‌چین و واکنش‌گرا
- پشتیبانی از PostgreSQL محلی و Supabase
- آماده استقرار یکپارچه فرانت‌اند و API روی Vercel

## فناوری‌های استفاده‌شده

| بخش | فناوری |
|---|---|
| فرانت‌اند | Next.js 14، React، TypeScript، Tailwind CSS |
| بک‌اند | Node.js، Express |
| دیتابیس | PostgreSQL، Prisma ORM |
| احراز هویت | JWT، bcryptjs |
| ایمیل | Nodemailer و SMTP |
| آپلود فایل | Multer |
| استقرار | Vercel Serverless Functions |

## ساختار پروژه

```text
rts/
├── api/
│   └── index.js                 # ورودی Serverless Function در Vercel
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # مدل‌های دیتابیس
│   │   └── migrations/          # migrationهای PostgreSQL
│   ├── scripts/
│   │   └── db-smoke-test.js     # تست عملی دیتابیس
│   ├── src/
│   │   ├── config/              # تنظیم Prisma
│   │   ├── middlewares/         # احراز هویت و آپلود
│   │   ├── modules/             # auth، jobs، applications و admin
│   │   ├── utils/               # JWT، ایمیل و slug
│   │   └── server.js            # برنامه Express
│   ├── create_tables.sql        # SQL آماده اجرا در Supabase
│   ├── compose.yaml             # PostgreSQL محلی با Docker
│   └── package.json
├── frontend/
│   ├── src/app/                 # صفحه‌های Next.js
│   ├── src/components/          # اجزای رابط کاربری
│   ├── src/lib/                 # API client و مدیریت توکن
│   └── package.json
├── vercel.json                  # تنظیم استقرار یکپارچه
└── README.md
```

## پیش‌نیازها

- Node.js نسخه ۲۰ LTS یا جدیدتر
- npm
- یکی از این موارد برای دیتابیس:
  - Docker Desktop برای PostgreSQL محلی
  - یک دیتابیس PostgreSQL آماده مانند Supabase

برای بررسی نصب بودن ابزارها:

```bash
node --version
npm --version
docker --version
```

## دریافت پروژه

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

اگر پس از Clone مستقیماً در پوشه پروژه قرار گرفته‌اید، دستور دوم لازم نیست.

## راه‌اندازی سریع با PostgreSQL محلی

### ۱. اجرای دیتابیس

```bash
cd backend
docker compose up -d postgres
```

برای مشاهده وضعیت کانتینر:

```bash
docker compose ps
```

### ۲. ساخت فایل تنظیمات بک‌اند

در macOS یا Linux:

```bash
cp .env.example .env
```

در PowerShell ویندوز:

```powershell
Copy-Item .env.example .env
```

محتوای پیش‌فرض برای Docker محلی مناسب است:

```env
DATABASE_URL="postgresql://resume_user:resume_password@localhost:5432/resume_form?schema=public"
PORT=4000
JWT_SECRET="یک-کلید-طولانی-تصادفی-و-امن"
```

### ۳. نصب بک‌اند و ساخت جدول‌ها

```bash
npm ci
npx prisma migrate deploy
```

دستور `npm ci` اسکریپت `postinstall` را اجرا و Prisma Client را تولید می‌کند. `prisma migrate deploy` نیز migrationهای موجود را روی دیتابیس اعمال می‌کند.

### ۴. نصب و تنظیم فرانت‌اند

```bash
cd ../frontend
npm ci
```

برای توسعه محلی، فایل `frontend/.env.local` را بسازید:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

این متغیر در محیط محلی ضروری است، چون فرانت‌اند و بک‌اند روی دو پورت متفاوت اجرا می‌شوند. در استقرار یکپارچه Vercel می‌توانید آن را خالی بگذارید تا درخواست‌ها به همان دامنه و مسیر نسبی `/api` ارسال شوند.

### ۵. اجرای پروژه

دو ترمینال باز کنید.

ترمینال اول، بک‌اند:

```bash
cd backend
npm run dev
```

ترمینال دوم، فرانت‌اند:

```bash
cd frontend
npm run dev
```

سپس این آدرس‌ها در دسترس هستند:

- فرانت‌اند: `http://localhost:3000`
- بک‌اند: `http://localhost:4000`
- بررسی سلامت بک‌اند: `http://localhost:4000/`

## راه‌اندازی با Supabase

۱. در Supabase یک پروژه بسازید و Connection String مربوط به PostgreSQL را از بخش تنظیمات دیتابیس بردارید.

۲. در `backend/.env` مقدار اتصال را قرار دهید:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
JWT_SECRET="یک-کلید-طولانی-تصادفی-و-امن"
PORT=4000
```

اگر رمز عبور شامل کاراکترهایی مانند `@`، `#` یا `/` است، آن را URL-encode کنید.

۳. برای ساخت جدول‌ها یکی از دو روش زیر را انتخاب کنید؛ هر دو را پشت‌سرهم اجرا نکنید.

روش اول، Prisma migration:

```bash
cd backend
npm ci
npx prisma migrate deploy
```

روش دوم، SQL Editor سوپابیس:

- فایل `backend/create_tables.sql` را باز کنید.
- کل محتوا را در SQL Editor سوپابیس قرار دهید.
- دستورها را یک‌بار اجرا کنید.

فایل SQL مستقیماً از `schema.prisma` تولید شده و شامل جدول‌ها، ایندکس‌ها و کلیدهای خارجی است.

## متغیرهای محیطی

### بک‌اند

| متغیر | الزامی | توضیح |
|---|---:|---|
| `DATABASE_URL` | بله | آدرس اتصال PostgreSQL یا Supabase |
| `JWT_SECRET` | بله | کلید امن برای امضای توکن‌ها |
| `PORT` | خیر | پورت اجرای محلی؛ پیش‌فرض `4000` |
| `FRONTEND_URL` | برای ایمیل | دامنه فرانت‌اند برای لینک بازیابی رمز |
| `SMTP_HOST` | برای ایمیل | میزبان SMTP |
| `SMTP_PORT` | برای ایمیل | معمولاً `465`، `587` یا `2525` |
| `SMTP_USER` | برای ایمیل | نام کاربری SMTP |
| `SMTP_PASS` | برای ایمیل | رمز SMTP |
| `MAIL_FROM` | خیر | نام و آدرس فرستنده ایمیل |

نمونه کامل:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=4000
FRONTEND_URL="http://localhost:3000"
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
MAIL_FROM="RTS <no-reply@example.com>"
```

### فرانت‌اند

| متغیر | محیط محلی | Vercel یکپارچه |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | خالی یا تعریف‌نشده |

هرگز فایل‌های `.env`، رمز دیتابیس یا `JWT_SECRET` واقعی را در Git ثبت نکنید.

## استقرار یکپارچه روی Vercel

پروژه برای اجرای فرانت‌اند و API روی یک دامنه تنظیم شده است. فایل ریشه `vercel.json`، فرانت‌اند را با Next.js و فایل `api/index.js` را با Node.js می‌سازد؛ این فایل برنامه Express داخل `backend/src/server.js` را export می‌کند.

۱. مخزن را به GitHub پوش کنید.

۲. پروژه را در Vercel Import کنید و Root Directory را روی پوشه‌ای قرار دهید که همین `README.md` و `vercel.json` داخل آن هستند.

۳. متغیرهای زیر را در Project Settings → Environment Variables اضافه کنید:

```text
DATABASE_URL
JWT_SECRET
FRONTEND_URL
SMTP_HOST       (اختیاری)
SMTP_PORT       (اختیاری)
SMTP_USER       (اختیاری)
SMTP_PASS       (اختیاری)
MAIL_FROM       (اختیاری)
```

۴. `NEXT_PUBLIC_API_URL` را برای استقرار یکپارچه حذف کنید یا خالی بگذارید. API client فرانت‌اند در این حالت درخواست‌ها را به `/api/...` روی همان دامنه می‌فرستد.

۵. Deploy را اجرا کنید. ساخت Prisma Client در `postinstall` انجام می‌شود و build به دیتابیس متصل نمی‌شود.

### نکته مهم درباره آپلود فایل در Vercel

نسخه فعلی فایل‌ها را در `backend/uploads` ذخیره می‌کند. فایل‌سیستم Serverless در Vercel دائمی نیست؛ بنابراین برای محیط production باید آپلود رزومه و فایل‌ها را به یک فضای ذخیره‌سازی دائمی مانند Supabase Storage، Amazon S3 یا سرویس مشابه منتقل کنید. دیتابیس PostgreSQL تحت تأثیر این محدودیت نیست.

## مسیرهای اصلی API

| مسیر | کاربرد |
|---|---|
| `/api/auth/register` | ثبت‌نام کارفرما |
| `/api/auth/login` | ورود |
| `/api/auth/me` | دریافت پروفایل کارفرما |
| `/api/auth/forgot-password` | درخواست بازیابی رمز |
| `/api/auth/reset-password` | تنظیم رمز جدید |
| `/api/jobs` | مدیریت موقعیت‌های شغلی |
| `/api/jobs/:id/form` | دریافت فرم و سؤال‌ها |
| `/api/jobs/:id/questions` | مدیریت سؤال‌ها |
| `/api/jobs/:id/rejection-rules` | مدیریت قوانین رد خودکار |
| `/api/applications/form/:slug` | دریافت فرم عمومی استخدام |
| `/api/applications/apply/:slug` | ارسال درخواست استخدام |
| `/api/admin/jobs/:id/applicants` | مدیریت متقاضیان یک شغل |

بیشتر مسیرهای مدیریتی به هدر زیر نیاز دارند:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## دستورات کاربردی

### بک‌اند

```bash
npm run dev              # اجرای توسعه با nodemon
npm start                # اجرای معمولی سرور
npm run build            # build سبک و بدون اتصال دیتابیس
npm run prisma:generate  # تولید Prisma Client
npm run prisma:migrate   # ساخت migration در محیط توسعه
npm run prisma:deploy    # اعمال migrationهای موجود
npm run prisma:studio    # رابط گرافیکی دیتابیس
npm run test:db          # تست CRUD، relation، transaction و cascade
```

### فرانت‌اند

```bash
npm run dev      # اجرای محیط توسعه
npm run build    # build تولیدی Next.js
npm start        # اجرای build تولیدی
npm run lint     # بررسی lint
```

## تست دیتابیس

پس از تنظیم `DATABASE_URL` و ساخت جدول‌ها:

```bash
cd backend
npm run test:db
```

این تست عملیات ایجاد و خواندن داده، relationها، transaction و cascade delete را بررسی می‌کند و داده آزمایشی خود را در پایان حذف می‌کند.

## رفع مشکلات رایج

### درخواست‌های `/api` روی Vercel خطای 404 می‌دهند

- Root Directory پروژه Vercel باید پوشه حاوی `vercel.json` ریشه باشد.
- فایل `api/index.js` باید در Git ثبت شده باشد.
- `NEXT_PUBLIC_API_URL` را برای استقرار یکپارچه خالی بگذارید.
- پس از تغییر `vercel.json` یک Redeploy بدون Build Cache انجام دهید.
- در Network مرورگر بررسی کنید درخواست به `/api/...` روی همان دامنه ارسال شود.

### مشکل Rewrite یا Redirect و مسیر اشتباه API

در محیط production، آدرس نهایی باید مشابه زیر باشد:

```text
https://your-domain.vercel.app/api/auth/login
```

اگر درخواست به `localhost:4000` یا مسیری با `//api` می‌رود، مقدار قدیمی `NEXT_PUBLIC_API_URL` هنوز در Vercel یا build cache باقی مانده است. متغیر را حذف و پروژه را مجدداً Deploy کنید.

### خطای اتصال Prisma یا `P1001`

- صحت `DATABASE_URL`، نام کاربری، رمز و host را بررسی کنید.
- برای Supabase معمولاً `sslmode=require` لازم است.
- اگر پروژه Supabase متوقف یا paused شده، ابتدا آن را فعال کنید.
- اتصال مستقیم و pooler سوپابیس پورت‌های متفاوت دارند؛ Connection String را کامل از داشبورد کپی کنید.

### `npm install` یا build معلق می‌ماند

build پروژه دستور `db push` اجرا نمی‌کند. اگر نسخه قدیمی هنوز روی Vercel اجرا می‌شود، Build Cache را پاک و Redeploy کنید. اسکریپت `postinstall` فقط `prisma generate` را اجرا می‌کند و به ساخت جدول‌ها متصل نمی‌شود.

### جدول‌ها از قبل وجود دارند

فایل `create_tables.sql` را فقط روی دیتابیس خالی اجرا کنید. اگر قبلاً `prisma migrate deploy` اجرا شده، SQL را دوباره اجرا نکنید.

### پورت ۳۰۰۰ یا ۴۰۰۰ اشغال است

پروسه قبلی را متوقف کنید یا مقدار `PORT` بک‌اند را تغییر دهید. در صورت تغییر پورت، `NEXT_PUBLIC_API_URL` فرانت‌اند را نیز مطابق آن تنظیم کنید.

### ایمیل بازیابی ارسال نمی‌شود

مقادیر SMTP را بررسی کنید. برای توسعه می‌توانید از Mailtrap استفاده کنید. مقدار `FRONTEND_URL` باید به دامنه‌ای اشاره کند که صفحه `/reset-password` روی آن در دسترس است.

## مزایای معماری پروژه

- **جداسازی مسئولیت‌ها:** فرانت‌اند، API، منطق ارزیابی و دسترسی دیتابیس مستقل و قابل نگهداری هستند.
- **قوانین قابل تنظیم:** امتیازها و رد خودکار در دیتابیس تعریف می‌شوند و برای تغییرشان نیازی به Deploy مجدد نیست.
- **موتور ارزیابی قابل تعویض:** منطق Rule Engine جداست و می‌توان در آینده آن را با موتور هوش مصنوعی جایگزین کرد.
- **قابل توسعه برای چند شغل:** هر کارفرما می‌تواند چند موقعیت، فرم و مجموعه قانون مستقل داشته باشد.
- **قابل حمل بودن دیتابیس:** Prisma schema، migration و SQL خام هم‌زمان در دسترس‌اند.
- **تجربه کاربری بومی:** رابط فارسی، RTL و مناسب فرایندهای استخدامی فارسی‌زبان است.
- **استقرار ساده:** فرانت‌اند و API می‌توانند روی یک دامنه Vercel و دیتابیس روی Supabase اجرا شوند.
- **امنیت پایه مناسب:** رمزها hash می‌شوند، مسیرهای مدیریتی با JWT محافظت می‌شوند و secretها از environment خوانده می‌شوند.

## مشارکت در توسعه

۱. مخزن را Fork کنید.

۲. یک branch بسازید:

```bash
git checkout -b feature/my-feature
```

۳. تغییرات را تست و commit کنید:

```bash
git add .
git commit -m "feat: add my feature"
```

۴. branch را push و Pull Request ایجاد کنید:

```bash
git push origin feature/my-feature
```

پیش از Pull Request مطمئن شوید build فرانت‌اند، اعتبار Prisma schema و تست دیتابیس متناسب با تغییر شما موفق هستند.
