import { SalesRecord, Sku, Store, Holiday, InventoryBatch } from '@/types';
import { addDays, isWeekend, isHoliday } from './helpers';

// ============================================================
// AI 预测引擎 V3
//
// 核心逻辑：
//   1. 预测明天销量(A) + 后天销量(B)
//   2. 当前总库存 = 已切块数 + 整模×6
//   3. 两日总需求 = A + B
//   4. 缺口 = max(0, 总需求 - 总库存)
//   5. 建议制作量 = ceil(缺口 ÷ 6)
//
// OM切角 = 巴斯克整只的 1/18
// ============================================================

const OM_TO_PARENT: Record<string, string> = {
  'OM咸芝士': '咸芝士', 'OM香爆了': '香爆了',
  'OM黑巧': '苦巧碎银子', 'OM牛肝菌': '牛肝菌',
};
const OM_RATIO = 1 / 18;

// ============================================================
// 类型
// ============================================================

export interface TwoDayPrediction {
  skuId: string;
  storeId: string;
  date: string;           // 生产日期（通常=明天）
  tomorrowSales: number;   // 明天预测销量(块)
  dayAfterSales: number;   // 后天预测销量(块)
  twoDayTotal: number;     // 两天总需求(块)
  cutStock: number;        // 当前已切库存(块)
  wholeStock: number;      // 当前整模库存(个)
  totalStock: number;      // 总库存(块) = cutStock + wholeStock × 6
  shortage: number;        // 缺口(块) = max(0, totalDemand - totalStock)
  suggestedBlocks: number; // 建议生产(块)
  suggestedUnits: number;  // 建议制作(个) = ceil(shortage ÷ 6)
  riskLevel: 'low' | 'medium' | 'high';
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

/** 获取SKU拆分库存：区分巴斯克(整模×6+切角) 和 罐罐(整罐×1)*/
function getSplitStock(storeId: string, skuId: string, batches: InventoryBatch[], skuCategory: string): { cut: number; whole: number; total: number } {
  let cut = 0, whole = 0;
  for (const b of batches) {
    if (b.storeId !== storeId || b.skuId !== skuId || b.remainingQuantity <= 0) continue;
    if (b.batchType === 'cut') cut += b.remainingQuantity;
    else whole += b.remainingQuantity;
  }
  if (skuCategory === '罐罐') return { cut: 0, whole, total: whole };
  return { cut, whole, total: cut + whole * 6 };
}

/** 预测单日销量 */
function predictSingleDay(targetDate: string, storeId: string, skuId: string, salesData: SalesRecord[], holidays?: Holiday[]): number {
  const recent3 = getMostRecentSales(storeId, skuId, salesData, 3);
  const latest = recent3.length > 0 ? recent3[0].qty : 0;
  const avg3 = recent3.length > 0 ? recent3.reduce((a, b) => a + b.qty, 0) / recent3.length : 0;
  const lastWeek = getSalesForDate(addDays(targetDate, -7), storeId, skuId, salesData);
  const avg4w = getSameWeekdayAvg(targetDate, storeId, skuId, 4, salesData);

  let base: number;
  if (avg4w > 0 && lastWeek > 0) {
    base = latest * 0.30 + avg3 * 0.25 + lastWeek * 0.25 + avg4w * 0.20;
  } else if (lastWeek > 0) {
    base = latest * 0.35 + avg3 * 0.30 + lastWeek * 0.35;
  } else if (avg3 > 0) {
    base = latest * 0.5 + avg3 * 0.5;
  } else {
    base = latest;
  }

  // 周末/节假日加权
  const isWeekendDay = [0, 6].includes(new Date(targetDate).getDay());
  const isHolidayDay = holidays ? isHoliday(targetDate, holidays) : false;
  let multiplier = 1.0;
  if (isWeekendDay) multiplier += 0.20;
  if (isHolidayDay) multiplier += 0.30;  // 节假日比周末加更多

  if (recent3.length >= 2) {
    const trend = recent3[0].qty / Math.max(1, recent3[1].qty);
    if (trend > 1.3) multiplier += 0.05;
    if (trend < 0.7) multiplier -= 0.05;
  }

  multiplier = Math.max(0.85, Math.min(1.5, multiplier));
  return Math.ceil(base * multiplier);
}

// ============================================================
// 主预测函数：两日滚动
// ============================================================

export function predictTwoDay(
  productionDate: string,
  storeId: string,
  skuId: string,
  salesData: SalesRecord[],
  inventoryBatches: InventoryBatch[],
  skuCategory?: string,
  holidays?: Holiday[],
): TwoDayPrediction {
  const cat = skuCategory || '6寸巴斯克';
  const isCanned = cat === '罐罐';
  const tomorrow = productionDate;
  const dayAfter = addDays(tomorrow, 1);

  // 预测两日销量（传入节假日配置）
  const tomorrowSales = predictSingleDay(tomorrow, storeId, skuId, salesData, holidays);
  const dayAfterSales = predictSingleDay(dayAfter, storeId, skuId, salesData, holidays);
  const totalDemand = tomorrowSales + dayAfterSales;

  // 当前库存
  const stock = getSplitStock(storeId, skuId, inventoryBatches, cat);

  // 缺口
  const shortage = Math.max(0, totalDemand - stock.total);

  // 建议制作：罐罐1罐=1个，巴斯克6块=1个
  const multiplier = isCanned ? 1 : 6;
  const suggestedUnits = Math.ceil(shortage / multiplier);
  const suggestedBlocks = shortage;

  // 风险
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const ratio = totalDemand > 0 ? stock.total / totalDemand : 999;
  if (ratio < 0.3) riskLevel = 'high';
  else if (ratio < 0.6) riskLevel = 'medium';

  return {
    skuId, storeId, date: productionDate,
    tomorrowSales, dayAfterSales, twoDayTotal: totalDemand,
    cutStock: stock.cut, wholeStock: stock.whole, totalStock: stock.total,
    shortage, suggestedBlocks, suggestedUnits, riskLevel,
  };
}

/** OMAKASE特殊：基于母品预测折算 */
export function predictOmakase(
  productionDate: string, storeId: string,
  salesData: SalesRecord[], inventoryBatches: InventoryBatch[],
  skus: Sku[], holidays?: Holiday[],
): TwoDayPrediction {
  let tomorrowSales = 0, dayAfterSales = 0, cutStock = 0, wholeStock = 0;

  for (const omName of Object.keys(OM_TO_PARENT)) {
    const parentName = OM_TO_PARENT[omName];
    const parentSku = skus.find(s => s.name === parentName);
    if (!parentSku) continue;
    const pred = predictTwoDay(productionDate, storeId, parentSku.id, salesData, inventoryBatches, parentSku.category, holidays);
    tomorrowSales += Math.ceil(pred.tomorrowSales * OM_RATIO);
    dayAfterSales += Math.ceil(pred.dayAfterSales * OM_RATIO);
    cutStock += pred.cutStock;
    wholeStock += pred.wholeStock;
  }

  const totalStock = cutStock + wholeStock * 6;
  const totalDemand = tomorrowSales + dayAfterSales;
  const shortage = Math.max(0, totalDemand - totalStock);
  const riskLevel = totalStock < totalDemand * 0.3 ? 'high' : totalStock < totalDemand * 0.6 ? 'medium' : 'low';

  return {
    skuId: 'sku-omakase', storeId, date: productionDate,
    tomorrowSales, dayAfterSales, twoDayTotal: totalDemand,
    cutStock, wholeStock, totalStock,
    shortage, suggestedBlocks: shortage, suggestedUnits: Math.ceil(shortage / 6),
    riskLevel,
  };
}
