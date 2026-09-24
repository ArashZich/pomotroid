import { toJalaali } from 'jalaali-js';

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const PERSIAN_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;
export const PERSIAN_WEEKDAYS_LONG = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts English digits to Persian digits.
 */
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

/**
 * Converts a Date or ISO string "YYYY-MM-DD" to Jalali components.
 */
export function toJalali(date: Date | string): { jy: number; jm: number; jd: number } {
  let d: Date;
  if (typeof date === 'string') {
    const parts = date.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return toJalaali(parts[0], parts[1], parts[2]);
    }
    d = new Date(date);
  } else {
    d = date;
  }
  return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formats a date into Jalali string (e.g. "۲ مهر" or "۲ مهر ۱۴۰۵").
 */
export function formatJalaliDate(
  date: Date | string,
  mode: 'short' | 'full' | 'month-day' = 'month-day',
  usePersianDigits = true
): string {
  const { jy, jm, jd } = toJalali(date);
  const monthName = PERSIAN_MONTH_NAMES[jm - 1] ?? '';
  const dayStr = usePersianDigits ? toPersianDigits(jd) : String(jd);
  const yearStr = usePersianDigits ? toPersianDigits(jy) : String(jy);

  if (mode === 'short') {
    return `${dayStr} ${monthName}`;
  }
  if (mode === 'full') {
    return `${dayStr} ${monthName} ${yearStr}`;
  }
  return `${dayStr} ${monthName}`;
}

/**
 * Converts seconds into human-readable duration format (e.g., "1h 30m" or "۱ ساعت و ۳۰ دقیقه").
 */
export function formatWorkDuration(secs: number, isPersian = false): string {
  const totalMins = Math.round(secs / 60);
  if (totalMins < 60) {
    if (isPersian) return `${toPersianDigits(totalMins)} دقیقه`;
    return `${totalMins}m`;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (isPersian) {
    if (mins === 0) return `${toPersianDigits(hours)} ساعت`;
    return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(mins)} دقیقه`;
  }
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
