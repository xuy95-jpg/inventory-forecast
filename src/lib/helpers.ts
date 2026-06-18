import { Holiday } from '@/types';

/**
 * 日期格式化工具
 */

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[d.getDay()];
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some(h => h.date === dateStr && h.isHoliday);
}

export function getHolidayName(dateStr: string, holidays: Holiday[]): string | null {
  const h = holidays.find(h => h.date === dateStr);
  return h ? h.name : null;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function daysUntilExpiry(expiryDate: string): number {
  return daysBetween(todayStr(), expiryDate);
}
// trigger redeploy
