# مستندات فاز: بومی‌سازی فارسی، تقویم جلالی و آمار کل کارکرد

> **تاریخ:** مهر ۱۴۰۵ / سپتامبر ۲۰۲۶  
> **شاخه گیت (Git Branch):** `feat/persian-jalali-stats`  
> **پایه شاخه:** ایجادشده از روی `feat/fullscreen-break-screen`  

این سند شامل تمامی تغییرات، پکیج‌های نصب‌شده، فایل‌های اضافه یا اصلاح‌شده و معماری ویژگی‌های پیاده‌سازی‌شده در این فاز است تا در آینده به‌راحتی قابل پیگیری و یادآوری باشد.

---

## ۱. وابستگی‌ها و پکیج‌های اضافه‌شده

### الف) پکیج‌های npm
- **`jalaali-js`** (`^1.3.1`): کتابخانه استاندارد، سبک و بدون وابستگی جانبی برای محاسبات دقیق تقویم جلالی (تبدیل میلادی به شمسی و بالعکس، تشخیص سال‌های کبیسه، طول ماه‌های شمسی).
- **`@types/jalaali-js`** (`devDependencies`): تعاریف تایپ‌های TypeScript برای کتابخانه فوق.

### ب) فونت‌های آفلاین
- فایل‌های فونت وزیرمتن در مسیر `static/fonts/` ذخیره شدند تا برنامه کاملاً آفلاین بماند:
  - `static/fonts/Vazirmatn-Regular.woff2` (وزن معمولی ۴۰۰)
  - `static/fonts/Vazirmatn-Bold.woff2` (وزن ضخیم ۷۰۰)
- در فایل `src/app.css` قوانین `@font-face` اضافه شد و `Vazirmatn` در اولویت فونت‌استک نرم‌افزار قرار گرفت.

---

## ۲. قابلیت‌ها و تغییرات پیاده‌سازی‌شده

### ۱. پشتیبانی از زبان فارسی و راست‌چین (Persian Localization & RTL)
- **فایل ترجمه:** ایجاد فایل کامل [`src/messages/fa.json`](file:///Users/arashzich/Projects/Arash/pomotroid/src/messages/fa.json) با ترجمه تخصصی، روان و استاندارد تمامی بخش‌های برنامه (تایمر، دایل، تنظیمات، آمار، اعلان‌ها و پرده استراحت).
- **پیکربندی Inlang:** کد زبان `"fa"` به آرایه `locales` در [`project.inlang/settings.json`](file:///Users/arashzich/Projects/Arash/pomotroid/project.inlang/settings.json) اضافه شد و با دستور `npm run paraglide:compile` کامپایل گردید.
- **انتخاب زبان:** گزینه «فارسی» به منوی زبان در [`SystemSection.svelte`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/components/settings/sections/SystemSection.svelte) اضافه شد.
- **راست‌چین خودکار (RTL):** در ماژول [`src/lib/locale.svelte.ts`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/locale.svelte.ts) با تغییر زبان به فارسی، صفت `dir="rtl"` روی تگ ریشه سند تنظیم می‌شود. همچنین استایل‌های تکمیلی در `src/app.css` اضافه شدند تا عناصر شمارنده و اعداد دایره‌ای تایمر جهت چپ‌به‌راست خود را برای خوانایی حفظ کنند.

### ۲. محاسبه و نمایش زمان‌های کل کاری (روز / هفته / ماه)
- **پایگاه داده (SQLite):**
  - افزودن ساختار `WorkSummary` و تابع `get_work_summary` در [`src-tauri/src/db/queries.rs`](file:///Users/arashzich/Projects/Arash/pomotroid/src-tauri/src/db/queries.rs).
  - محاسبه دقیق مجموع ثانیه‌های کاری (`duration_secs`) و تعداد راندهای کامل‌شده برای سه بازه:
    - **امروز (Today):** جلسات ثبت‌شده در تاریخ روز جاری سیستم.
    - **این هفته (This Week):** جلسات ثبت‌شده در ۷ روز اخیر.
    - **این ماه (This Month):** جلسات ثبت‌شده در ۳۰ روز اخیر.
- **فرمان‌های IPC بک‌اند به فرانت‌اند:**
  - افزودن فرمان Tauri جدید `stats_get_work_summary` در [`src-tauri/src/commands.rs`](file:///Users/arashzich/Projects/Arash/pomotroid/src-tauri/src/commands.rs).
  - قرار دادن ساختار `work_summary` درون داده‌های بازگشتی `stats_get_detailed`.
  - ثبت فرمان در `generate_handler!` داخل [`src-tauri/src/lib.rs`](file:///Users/arashzich/Projects/Arash/pomotroid/src-tauri/src/lib.rs).
- **اتصال فرانت‌اند:**
  - افزودن تایپ `WorkSummary` در [`src/lib/types.ts`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/types.ts).
  - متد IPC جدید `statsGetWorkSummary()` در [`src/lib/ipc/index.ts`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/ipc/index.ts).
- **نمایش در صفحه تایمر اصلی (`Timer.svelte`):**
  - نشانگر مینی‌مال کپسولی (`today-work-pill`) در زیر کنترل‌ها اضافه شد.
  - این نشانگر زمان کل کاری امروز را نشان می‌دهد و هنگام فعال بودن راند تمرکز، ثانیه‌شمار زنده را به کارکرد روز اضافه می‌کند.
  - با نگه داشتن موس روی این نشانگر (Tooltip)، خلاصه عملکرد امروز، این هفته و این ماه با تفکیک ساعت و دقیقه نمایش می‌یابد.
- **نمایش در پنجره آمار (`DailyView.svelte` و `WeeklyView.svelte`):**
  - یک نوار کارت ۳تایی هماهنگ با تم برنامه در بالای تب روزانه قرار گرفت که مجموع زمان و راندهای روز، هفته و ماه را نمایش می‌دهد.

### ۳. ماژول تقویم جلالی و بومی‌سازی تقویم (Jalali Calendar)
- **ماژول اختصاصی [`src/lib/utils/jalali.ts`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/utils/jalali.ts):**
  - توابع `toJalali` برای تجزیه تاریخ به اجزای جلالی (`jy`, `jm`, `jd`).
  - آرایه‌های نام‌های ماه‌های شمسی (`فروردین` تا `اسفند`).
  - نام‌های روزهای هفته شمسی (`شنبه` تا `جمعه` و مخفف‌های `ش` تا `ج`).
  - تابع `toPersianDigits` برای تبدیل ارقام انگلیسی به فارسی.
  - تابع `formatWorkDuration` برای تبدیل ثانیه‌ها به فرمت فارسی (مانند «۲ ساعت و ۳۰ دقیقه»).
- **نمودار هفتگی ([`WeeklyView.svelte`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/components/stats/WeeklyView.svelte)):**
  - نام روزها با حروف و تقویم فارسی ست شده و برچسب تاریخ روزها به‌صورت شمسی (مثلاً ۳ مهر) درج می‌شود.
  - زمان کل کارکرد هفته در بالای نمودار درج می‌شود.
- **نمودار هیت‌مپ سالانه ([`YearlyView.svelte`](file:///Users/arashzich/Projects/Arash/pomotroid/src/lib/components/stats/YearlyView.svelte)):**
  - نام ماه‌ها بر اساس ماه‌های شمسی گروه‌بندی و نمایش داده می‌شوند.
  - برچسب روزهای هفته به حروف فارسی تبدیل شده‌اند.
  - نویگیشن سال با سال شمسی (۱۴۰۴ / ۱۴۰۵) و ارقام فارسی کار می‌کند.
  - تولتیپ تعاملی هر روز، تاریخ کامل شمسی و تعداد راندها را به فارسی نمایش می‌دهد.

---

## ۳. لیست فایل‌های تغییریافته و ایجادشده

| نوع تغییر | مسیر فایل | توضیحات |
| :--- | :--- | :--- |
| **ایجاد** | `src/lib/utils/jalali.ts` | ماژول توابع محاسباتی و فرمت تقویم جلالی |
| **ایجاد** | `src/messages/fa.json` | ترجمه کامل کلیه رشته‌های برنامه به فارسی |
| **ایجاد** | `static/fonts/Vazirmatn-Regular.woff2` | فونت وزیرمتن عادی |
| **ایجاد** | `static/fonts/Vazirmatn-Bold.woff2` | فونت وزیرمتن ضخیم |
| **اصلاح** | `package.json` و `package-lock.json` | افزودن پکیج‌های `jalaali-js` و تایپ‌های آن |
| **اصلاح** | `project.inlang/settings.json` | افزودن زبان `fa` به زبان‌های پروژه |
| **اصلاح** | `src/app.css` | تعریف فونت وزیرمتن، اولویت فونت و استایل‌های RTL |
| **اصلاح** | `src-tauri/src/db/queries.rs` | پیاده‌سازی کوئری `get_work_summary` |
| **اصلاح** | `src-tauri/src/commands.rs` | اضافه شدن کامند `stats_get_work_summary` |
| **اصلاح** | `src-tauri/src/lib.rs` | ثبت کامند جدید در هندلر تائوری |
| **اصلاح** | `src/lib/types.ts` | تعریف اینترفیس `WorkSummary` |
| **اصلاح** | `src/lib/ipc/index.ts` | تعریف تابع `statsGetWorkSummary` |
| **اصلاح** | `src/lib/locale.svelte.ts` | تنظیم خودکار دایرکشن RTL در تغییر به زبان فارسی |
| **اصلاح** | `src/lib/components/Timer.svelte` | نمایش نشانگر زنده کارکرد امروز و تولتیپ هفته/ماه |
| **اصلاح** | `src/lib/components/settings/sections/SystemSection.svelte` | افزودن زبان فارسی به لیست تنظیمات |
| **اصلاح** | `src/lib/components/stats/DailyView.svelte` | نوار کارت‌های کارکرد امروز/هفته/ماه و ارقام فارسی |
| **اصلاح** | `src/lib/components/stats/WeeklyView.svelte` | تقویم شمسی، روزهای فارسی و زمان کار هفتگی |
| **اصلاح** | `src/lib/components/stats/YearlyView.svelte` | هیت‌مپ با ماه‌ها و سال‌های شمسی و تولتیپ فارسی |
| **اصلاح** | `src/routes/stats/+page.svelte` | ارسال داده‌های خلاصه کاری به کامپوننت‌های آمار |
| **اصلاح** | `src/messages/en.json` | همگام‌سازی کلیدهای جدید اضافه شده برای آمار |

---

## ۴. دستورات مهم برای توسعه، تست و بیلد

```bash
# ۱. اجرای برنامه در حالت توسعه (Tauri + Vite)
npm run tauri dev

# ۲. کامپایل مجدد ترجمه‌ها (پس از ویرایش فایل‌های ترجمه)
npm run paraglide:compile

# ۳. بررسی خطاهای تایپ‌اسکریپت و سولت
npm run check

# ۴. اجرای تست‌های بک‌اند Rust
cargo test --manifest-path src-tauri/Cargo.toml

# ۵. ساخت نسخه نهایی و تولید پکیج DMG مک
npm run tauri build
```

---

## ۵. مسیر خروجی‌های نهایی بیلد

- **فایل نصبی DMG مک (سیلیکون و آرم aarch64):**
  `src-tauri/target/release/bundle/dmg/Pomotroid_1.7.1_aarch64.dmg`
- **اپلیکیشن مستقل (App Bundle):**
  `src-tauri/target/release/bundle/macos/Pomotroid.app`
