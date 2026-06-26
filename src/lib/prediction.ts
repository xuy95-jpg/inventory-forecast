import { SalesRecord, Sku, Holiday, InventoryBatch } from '@/types';
import { addDays } from './helpers';

// ============================================================
// AI 预测引擎 V4
//
// 生产阈值分级（基于近30天日均）：
//   大款(日均≥12): 缺口>1块 → ceil(缺口÷6)个
//   中款(日均≥5):  缺口>3块 → ceil(缺口÷6)个
//   小款(日均<5):  缺口>4块 → ceil(缺口÷6)个
//
// OMAKASE: 不单独生产，销量按1/18折算到4个母品
// ============================================================

const OM_PARENTS = ['咸芝士', '香爆了', '苦巧碎银子', '牛肝菌'];
const OM_RATIO = 1 / 18;

export interface TwoDayPrediction {
  skuId: string;
  storeId: string;
  date: string;
  tomorrowSales: number;
  dayAfterSales: number;
  twoDayTotal: number;
  cutStock: number;
  wholeStock: number;
  totalStock: number;
  shortage: number;
  suggestedBlocks: number;
  suggestedUnits: number;
  tier: string;        // 大款/中款/小款
  threshold: number;   // 触发阈值
  dailyAvg: number;    // 日均销量
  riskLevel: 'low' | 'medium' | 'high';
  isOmakase: boolean;  // OMAKASE不单独生产
}

// ============================================================
// 内部函数
// ============================================================

function getMostRecentSales(storeId: string, skuId: string, salesData: SalesRecord[], count: number): { date: string; qty: number }[] {
  return salesData
    .filter(r => r.storeId === storeId && r.skuId === skuId && r.salesQuantity > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count)
    .map(r => ({ date: r.date, qty: r.salesQuantity }));
}

function getSalesForDate(date: string, storeId: string, skuId: string, salesData: SalesRecord[]): number {
  return salesData.find(r => r.date === date && r.storeId === storeId && r.skuId === skuId)?.salesQuantity ?? 0;
}

function getSameWeekdayAvg(targetDate: string, storeId: string, skuId: string, weeks: number, salesData: SalesRecord[]): number {
  const targetDay = new Date(targetDate).getDay();
  let total = 0, count = 0;
  for (let w = 1; w <= weeks; w++) {
    const date = addDays(targetDate, -7 * w);
    if (new Date(date).getDay() !== targetDay) continue;
    const sales = getSalesForDate(date, storeId, skuId, salesData);
    if (sales > 0) { total += sales; count++; }
  }
  return count > 0 ? total / count : 0;
}

/** 计算近30天日均 */
function getDailyAvg(storeId: string, skuId: string, salesData: SalesRecord[]): number {
  const records = salesData
    .filter(r => r.storeId === storeId && r.skuId === skuId && r.salesQuantity > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (records.length === 0) return 0;
  const cutoff = addDays(records[0].date, -30);
  const recent = records.filter(r => r.date >= cutoff && r.salesQuantity > 0);
  if (recent.length === 0) return records.reduce((s, r) => s + r.salesQuantity, 0) / records.length;
  return recent.reduce((s, r) => s + r.salesQuantity, 0) / recent.length;
}

/** 生产阈值 */
function getThreshold(dailyAvg: number): { tier: string; threshold: number } {
  if (dailyAvg >= 12) return { tier: '大款', threshold: 1 };
  if (dailyAvg >= 5) return { tier: '中款', threshold: 3 };
  return { tier: '小款', threshold: 4 };
}

function getSplitStock(storeId: string, skuId: string, salesData: SalesRecord[], skuCategory: string, forDate?: string): { cut: number; whole: number; total: number } {
  // Find the most recent 盘点 record on or before the specified date
  let best: SalesRecord | undefined;
  for (const r of salesData) {
    if (r.storeId !== storeId || r.skuId !== skuId) continue;
    if (r.cutStock <= 0 && r.wholeStock <= 0) continue;
    if (forDate && r.date > forDate) continue;
    if (!best || r.date > best.date || (r.date === best.date && r.updatedAt > best.updatedAt)) best = r;
  }

  const cut = best?.cutStock || 0;
  const whole = best?.wholeStock || 0;

  if (skuCategory === '罐罐') return { cut: 0, whole: 0, total: cut };
  return { cut, whole, total: cut + whole * 6 };
}

/** 预测单日销量 */
function predictSingleDay(targetDate: string, storeId: string, skuId: string, salesData: SalesRecord[]): number {
  const recent3 = getMostRecentSales(storeId, skuId, salesData, 3);
  const latest = recent3.length > 0 ? recent3[0].qty : 0;
  const avg3 = recent3.length > 0 ? recent3.reduce((a, b) => a + b.qty, 0) / recent3.length : 0;
  const lastWeek = getSalesForDate(addDays(targetDate, -7), storeId, skuId, salesData);
  const avg4w = getSameWeekdayAvg(targetDate, storeId, skuId, 4, salesData);

  let base: number;
  if (avg4w > 0 && lastWeek > 0) base = latest * 0.30 + avg3 * 0.25 + lastWeek * 0.25 + avg4w * 0.20;
  else if (lastWeek > 0) base = latest * 0.35 + avg3 * 0.30 + lastWeek * 0.35;
  else if (avg3 > 0) base = latest * 0.5 + avg3 * 0.5;
  else base = latest;

  const isWeekendDay = [0, 6].includes(new Date(targetDate).getDay());
  let multiplier = isWeekendDay ? 1.20 : 1.0;
  if (recent3.length >= 2) {
    const trend = recent3[0].qty / Math.max(1, recent3[1].qty);
    if (trend > 1.3) multiplier += 0.05;
    if (trend < 0.7) multiplier -= 0.05;
  }
  multiplier = Math.max(0.85, Math.min(1.5, multiplier));
  return Math.ceil(base * multiplier);
}

// ============================================================
// 主预测函数
// ============================================================

export function predictTwoDay(
  productionDate: string, storeId: string, skuId: string,
  salesData: SalesRecord[], inventoryBatches: InventoryBatch[],
  skuCategory?: string,
): TwoDayPrediction {
  const cat = skuCategory || '6寸巴斯克';
  const isCanned = cat === '罐罐';
  const isOmakase = cat === 'OMAKASE';
  const tomorrow = productionDate;
  const dayAfter = addDays(tomorrow, 1);

  const tomorrowSales = predictSingleDay(tomorrow, storeId, skuId, salesData);
  const dayAfterSales = predictSingleDay(dayAfter, storeId, skuId, salesData);
  const totalDemand = tomorrowSales + dayAfterSales;

  const stock = getSplitStock(storeId, skuId, salesData, cat, productionDate);
  const shortage = Math.max(0, totalDemand - stock.total);

  const dailyAvg = getDailyAvg(storeId, skuId, salesData);
  const { tier, threshold } = getThreshold(dailyAvg);

  const multiplier = isCanned ? 1 : 6;
  let suggestedUnits = 0;
  if (shortage > threshold) suggestedUnits = Math.ceil(shortage / multiplier);

  if (isOmakase) suggestedUnits = 0; // OMAKASE 不单独生产

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const ratio = totalDemand > 0 ? stock.total / totalDemand : 999;
  if (ratio < 0.3) riskLevel = 'high';
  else if (ratio < 0.6) riskLevel = 'medium';

  return {
    skuId, storeId, date: productionDate,
    tomorrowSales, dayAfterSales, twoDayTotal: totalDemand,
    cutStock: stock.cut, wholeStock: stock.whole, totalStock: stock.total,
    shortage, suggestedBlocks: shortage > threshold ? shortage : 0, suggestedUnits,
    tier, threshold, dailyAvg,
    riskLevel, isOmakase,
  };
}

/** 将OMAKASE销量折算到母品 */
export function applyOmakaseSplit(
  omPrediction: TwoDayPrediction,
  predictions: TwoDayPrediction[],
  skus: Sku[],
): TwoDayPrediction[] {
  if (!omPrediction.isOmakase) return predictions;
  const omTomorrow = omPrediction.tomorrowSales;
  const omDayAfter = omPrediction.dayAfterSales;

  return predictions.map(p => {
    const sku = skus.find(s => s.id === p.skuId);
    if (!sku || !OM_PARENTS.includes(sku.name)) return p;
    const extraTomorrow = Math.ceil(omTomorrow * OM_RATIO);
    const extraDayAfter = Math.ceil(omDayAfter * OM_RATIO);
    const extraTotal = extraTomorrow + extraDayAfter;
    const newShortage = Math.max(0, p.shortage + extraTotal);
    const multiplier = sku.category === '罐罐' ? 1 : 6;
    let newUnits = 0;
    if (newShortage > p.threshold) newUnits = Math.ceil(newShortage / multiplier);
    return {
      ...p,
      tomorrowSales: p.tomorrowSales + extraTomorrow,
      dayAfterSales: p.dayAfterSales + extraDayAfter,
      twoDayTotal: p.twoDayTotal + extraTotal,
      shortage: newShortage,
      suggestedBlocks: newShortage > p.threshold ? newShortage : 0,
      suggestedUnits: newUnits,
    };
  });
}
