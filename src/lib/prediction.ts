import {
  SalesRecord,
  Sku,
  Store,
  Holiday,
  PredictionResult,
  InventoryBatch,
} from '@/types';
import { addDays, isWeekend, isHoliday } from './helpers';

/**
 * AI 预测引擎 (V2)
 *
 * 核心思路：用数据库中最近的真实销量 + 同星期历史规律
 * 不会因为目标日期和最新数据之间有gap而失败
 *
 * 切角 = 完整巴斯克的 1/6
 * OM = 切角的 1/3
 */

// ============================================================
// SKU 关系映射
// ============================================================
const OM_TO_PARENT: Record<string, string> = {
  'OM咸芝士': '咸芝士',
  'OM香爆了': '香爆了',
  'OM黑巧': '苦巧碎银子',
  'OM牛肝菌': '牛肝菌',
};

const OM_RATIO = 1 / 18;

// ============================================================
// 核心函数
// ============================================================

/** 找某个SKU门店最近N天有销量的日期和销量 */
function getMostRecentSales(
  storeId: string,
  skuId: string,
  salesData: SalesRecord[],
  count: number
): { date: string; qty: number }[] {
  const records = salesData
    .filter(r => r.storeId === storeId && r.skuId === skuId && r.salesQuantity > 0)
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  return records.slice(0, count).map(r => ({ date: r.date, qty: r.salesQuantity }));
}

/** 找最近一天的销量 */
function getLatestSales(storeId: string, skuId: string, salesData: SalesRecord[]): number {
  const recent = getMostRecentSales(storeId, skuId, salesData, 1);
  return recent.length > 0 ? recent[0].qty : 0;
}

/** 获取最近N天有销量的日期 */
function getLatestDateWithData(
  storeId: string,
  skuId: string,
  salesData: SalesRecord[]
): string | null {
  const recent = getMostRecentSales(storeId, skuId, salesData, 1);
  return recent.length > 0 ? recent[0].date : null;
}

/** 获取同星期几的近N周均值 */
function getSameWeekdayAvg(
  targetDate: string,
  storeId: string,
  skuId: string,
  weeks: number,
  salesData: SalesRecord[]
): number {
  const targetDay = new Date(targetDate).getDay();
  let total = 0;
  let count = 0;

  for (let w = 1; w <= weeks; w++) {
    const date = addDays(targetDate, -7 * w);
    if (new Date(date).getDay() !== targetDay) continue;
    const record = salesData.find(
      r => r.date === date && r.storeId === storeId && r.skuId === skuId
    );
    const sales = record?.salesQuantity ?? 0;
    if (sales > 0) {
      total += sales;
      count++;
    }
  }

  return count > 0 ? total / count : 0;
}

/** 计算可售库存 */
function getAvailableStock(
  storeId: string,
  skuId: string,
  inventoryBatches: InventoryBatch[]
): number {
  return inventoryBatches
    .filter(b => b.storeId === storeId && b.skuId === skuId && b.remainingQuantity > 0)
    .reduce((sum, b) => sum + b.remainingQuantity, 0);
}

// ============================================================
// 主预测函数
// ============================================================

export function predictSales(
  targetDate: string,
  storeId: string,
  skuId: string,
  salesData: SalesRecord[],
  inventoryBatches: InventoryBatch[],
  holidays: Holiday[],
  skus: Sku[]
): PredictionResult {
  const sku = skus.find(s => s.id === skuId);

  // OMAKASE
  if (sku?.category === 'OMAKASE') {
    return predictOmChild(targetDate, storeId, skuId, salesData, inventoryBatches, holidays, skus);
  }

  // ========================================
  // 普通产品：找最近3天真实数据
  // ========================================
  const recent3 = getMostRecentSales(storeId, skuId, salesData, 3);
  const recent3Qty = recent3.map(r => r.qty);
  const recent3Avg = recent3.length > 0
    ? recent3Qty.reduce((a, b) => a + b, 0) / recent3.length
    : 0;

  // 最近一天
  const latestSales = recent3.length > 0 ? recent3[0].qty : 0;
  const latestDate = recent3.length > 0 ? recent3[0].date : null;

  // 同星期对比（从目标日期倒推）
  const sameDayLastWeek = (() => {
    const d = addDays(targetDate, -7);
    const r = salesData.find(rec => rec.date === d && rec.storeId === storeId && rec.skuId === skuId);
    return r?.salesQuantity ?? 0;
  })();

  const sameDay4WeekAvg = getSameWeekdayAvg(targetDate, storeId, skuId, 4, salesData);

  // ---- 加权计算 ----
  let basePrediction: number;

  if (sameDay4WeekAvg > 0 && sameDayLastWeek > 0) {
    basePrediction =
      latestSales * 0.30 +
      recent3Avg * 0.25 +
      sameDayLastWeek * 0.25 +
      sameDay4WeekAvg * 0.20;
  } else if (sameDayLastWeek > 0) {
    basePrediction =
      latestSales * 0.35 +
      recent3Avg * 0.30 +
      sameDayLastWeek * 0.35;
  } else if (recent3Avg > 0) {
    basePrediction =
      latestSales * 0.5 +
      recent3Avg * 0.5;
  } else {
    basePrediction = 0;
  }

  // ---- 周末/节假日调整 ----
  const weekend = isWeekend(targetDate);
  const holiday = isHoliday(targetDate, holidays);

  let multiplier = 1.0;
  if (weekend) multiplier += 0.20;
  if (holiday) multiplier += 0.30;

  // ---- 趋势微调 ----
  if (recent3.length >= 2) {
    const trendRatio = recent3[0].qty / Math.max(1, recent3[1].qty);
    if (trendRatio > 1.3) multiplier += 0.05;
    if (trendRatio < 0.7) multiplier -= 0.05;
  }

  multiplier = Math.max(0.85, Math.min(1.5, multiplier));
  const adjustedPrediction = Math.ceil(basePrediction * multiplier);

  // ---- 可售库存 ----
  const availableStock = getAvailableStock(storeId, skuId, inventoryBatches);

  // ---- 建议生产量 ----
  const suggestedProduction = Math.max(0, adjustedPrediction - availableStock);

  // ---- 风险等级 ----
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const stockRatio = adjustedPrediction > 0 ? availableStock / adjustedPrediction : 999;
  if (stockRatio < 0.3) riskLevel = 'high';
  else if (stockRatio < 0.6) riskLevel = 'medium';

  // ---- 置信度 ----
  const dataPoints = salesData.filter(
    r => r.storeId === storeId && r.skuId === skuId && r.salesQuantity > 0
  ).length;
  const confidence = Math.min(0.95, dataPoints / 20);

  return {
    skuId,
    storeId,
    date: targetDate,
    predictedSales: adjustedPrediction,
    availableStock,
    suggestedProduction,
    riskLevel,
    confidence,
    factors: [
      { name: '最近销量', value: latestSales, weight: 0.30 },
      { name: '近3日均值', value: Math.round(recent3Avg), weight: 0.25 },
      { name: '上周同星期', value: sameDayLastWeek, weight: 0.25 },
      { name: '近4周同星期均值', value: Math.round(sameDay4WeekAvg), weight: 0.20 },
      { name: '最新数据日期', value: latestDate ? 1 : 0, weight: 0 },
      { name: weekend ? '周末加成' : '非周末', value: weekend ? 0.20 : 0, weight: 0 },
      { name: holiday ? '节假日加成' : '非节日', value: holiday ? 0.30 : 0, weight: 0 },
    ],
  };
}

// ============================================================
// OMAKASE 切角单品预测
// ============================================================

function predictOmChild(
  omSkuId: string,
  targetDate: string,
  storeId: string,
  salesData: SalesRecord[],
  inventoryBatches: InventoryBatch[],
  holidays: Holiday[],
  skus: Sku[]
): PredictionResult {
  const omSku = skus.find(s => s.id === omSkuId);
  if (!omSku) {
    return { skuId: omSkuId, storeId, date: targetDate, predictedSales: 0, availableStock: 0, suggestedProduction: 0, riskLevel: 'low', confidence: 0, factors: [] };
  }

  const parentName = OM_TO_PARENT[omSku.name];
  if (!parentName) {
    return { skuId: omSkuId, storeId, date: targetDate, predictedSales: 0, availableStock: 0, suggestedProduction: 0, riskLevel: 'low', confidence: 0, factors: [] };
  }

  const parentSku = skus.find(s => s.name === parentName);
  if (!parentSku) {
    return { skuId: omSkuId, storeId, date: targetDate, predictedSales: 0, availableStock: 0, suggestedProduction: 0, riskLevel: 'low', confidence: 0, factors: [] };
  }

  const parentPrediction = predictSales(targetDate, storeId, parentSku.id, salesData, inventoryBatches, holidays, skus);
  const omPredicted = Math.ceil(parentPrediction.predictedSales * OM_RATIO);
  const availableStock = getAvailableStock(storeId, omSkuId, inventoryBatches);

  return {
    skuId: omSkuId, storeId, date: targetDate,
    predictedSales: omPredicted, availableStock,
    suggestedProduction: Math.max(0, omPredicted - availableStock),
    riskLevel: availableStock < omPredicted * 0.3 ? 'high' : 'low',
    confidence: parentPrediction.confidence * 0.8,
    factors: [
      { name: parentName + '预测销量', value: parentPrediction.predictedSales, weight: OM_RATIO },
      { name: '切角1/6 × OM1/3 = 1/18', value: OM_RATIO, weight: 0 },
    ],
  };
}

// ============================================================
// 批量预测
// ============================================================

export function predictAll(
  targetDate: string,
  salesData: SalesRecord[],
  inventoryBatches: InventoryBatch[],
  holidays: Holiday[],
  skus: Sku[],
  stores: Store[]
): PredictionResult[] {
  const results: PredictionResult[] = [];
  for (const store of stores) {
    for (const sku of skus) {
      results.push(predictSales(targetDate, store.id, sku.id, salesData, inventoryBatches, holidays, skus));
    }
  }
  return results;
}
