import { Holiday } from '@/types';

export const mockHolidays: Holiday[] = [
  { date: '2026-01-01', name: '元旦', isHoliday: true },
  { date: '2026-02-14', name: '情人节', isHoliday: true },
  { date: '2026-05-01', name: '劳动节', isHoliday: true },
  { date: '2026-05-31', name: '端午节', isHoliday: true },
  { date: '2026-06-01', name: '儿童节', isHoliday: false },  // 不是独立节日（6/1销量-40%，端午后自然回落）
  { date: '2026-10-01', name: '国庆节', isHoliday: true },
  { date: '2026-10-04', name: '中秋节', isHoliday: true },
  { date: '2026-12-25', name: '圣诞节', isHoliday: false },
];
