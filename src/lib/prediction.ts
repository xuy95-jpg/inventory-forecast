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
 * 预测逻辑与武林路当日表格对齐：
 *   1. 同级对比：上周同星期销量 + 两周前同星期销量
 *   2. 近期趋势：近3日均值
 *   3. 历史参考：近4周同星期均值
 *   4. 周末/节假日加权
 *
 * OMAKASE 产品：
 *   OM咸芝士    ← 咸芝士 切角 1/3 (=完整巴斯克 1/6 × 1/3 = 1/18)
 *   OM香爆了    ← 香爆了 切角 1/3
 *   OM黑巧      ← 苦巧碎银子 切角 1/3
 *   OM牛肝菌    ← 牛肝菌 切角 1/3
 *   OMAKASE(份) = 4个OM品各1个的集合
 *
 * 切角 = 完整巴斯克的 1/6
 * OM = 切角的 1/3
 */

// ============================================================
// SKU 关系映射
// ============================================================

/** OM切角子品 → 母品（整只巴斯克）映射 */
const OM_TO_PARENT: Record<string, string> = {
  'OM咸芝士': '咸芝士',
  'OM香爆了': '香爆了',
  'OM黑巧': '苦巧碎银子',
  'OM牛肝菌': '牛肝菌',
};

/** OM切角占比：完整巴斯克 → 切角(1/6) → OM(1/3切角) → OM = 1/18 整只 */
const OM_RATIO = 1 / 18;

// ============================================================
// 核心函数
// ============================================================

/** 获取某个日期、门店、SKU的销量 */
function getSalesForDate(
  date: string,
  storeId: string,
  skuId: string,
  salesData: SalesRecord[]
): number {
  const record = salesData.find(
    r => r.date === date && r.storeId === storeId && r.skuId === skuId
  );
  return record?.salesQuantity ?? 0;
}

/** 获取过去N天平均销量（只算有数据的日期） */
function getAvgSales(
  startDate: string,
  endDate: string,
  storeId: string,
  skuId: string,
  salesData: SalesRecord[]
): number {
  const records = salesData.filter(
    r =>
      r.date >= startDate &&
      r.date <= endDate &&
      r.storeId === storeId &&
      r.skuId === skuId
  );

  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + r.salesQuantity, 0);
  return total / records.length;
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
    // 确保是同星期
    if (new Date(date).getDay() !== targetDay) continue;
    const sales = getSalesForDate(date, storeId, skuId, salesData);
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

  // ---- OMAKASE 子品：从母品折算 ----
  if (sku?.category === 'OMAKASE') {
    return predictOmChild(targetDate, storeId, skuId, salesData, inventoryBatches, holidays, skus);
  }

  // ========================================
  // 普通产品预测
  // ========================================

  const yesterday = addDays(targetDate, -1);
  const dayBefore = addDays(targetDate, -2);
  const twoDaysBefore = addDays(targetDate, -3);

  // 近期数据
  const yesterdaySales = getSalesForDate(yesterday, storeId, skuId, salesData);
  const dayBeforeSales = getSalesForDate(dayBefore, storeId, skuId, salesData);
  const twoDaysBeforeSales = getSalesForDate(twoDaysBefore, storeId, skuId, salesData);

  // 近3日均值
  const recent3Count = [yesterdaySales, dayBeforeSales, twoDaysBeforeSales].filter(v => v > 0).length;
  const recent3Avg = recent3Count > 0
    ? (yesterdaySales + dayBeforeSales + twoDaysBeforeSales) / Math.max(1, recent3Count)
    : 0;

  // 近7日均值
  const last7DaysAvg = getAvgSales(addDays(targetDate, -7), yesterday, storeId, skuId, salesData);

  // 同星期对比
  const sameDayLastWeek = getSalesForDate(addDays(targetDate, -7), storeId, skuId, salesData);
  const sameDay4WeekAvg = getSameWeekdayAvg(targetDate, storeId, skuId, 4, salesData);

  // ========================================
  // 加权计算
  // weight distribution aligns with table logic:
  //   最近数据权重最高，同星期对比作为基底
  // ========================================
  let basePrediction: number;

  if (sameDay4WeekAvg > 0 && sameDayLastWeek > 0) {
    // 有充足历史数据：加权平均
    basePrediction =
      yesterdaySales * 0.30 +
      recent3Avg * 0.25 +
      sameDayLastWeek * 0.25 +
      sameDay4WeekAvg * 0.20;
  } else if (sameDayLastWeek > 0) {
    // 只有上周数据
    basePrediction =
      yesterdaySales * 0.35 +
      recent3Avg * 0.30 +
      sameDayLastWeek * 0.35;
  } else {
    // 新SKU：依赖近期均值
    basePrediction = recent3Avg > 0
      ? recent3Avg * 0.6 + yesterdaySales * 0.4
      : yesterdaySales;
  }

  // ---- 周末/节假日调整 ----
  const weekend = isWeekend(targetDate);
  const holiday = isHoliday(targetDate, holidays);

  let multiplier = 1.0;
  if (weekend) multiplier += 0.20;
  if (holiday) multiplier += 0.30;

  // ---- 如果最近数据有明显上升/下降趋势，微调 ----
  if (yesterdaySales > 0 && dayBeforeSales > 0) {
    const trendRatio = yesterdaySales / Math.max(1, dayBeforeSales);
    if (trendRatio > 1.3) multiplier += 0.05;   // 上升趋势
    if (trendRatio < 0.7) multiplier -= 0.05;    // 下降趋势
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
      { name: '昨日销量', value: yesterdaySales, weight: 0.30 },
      { name: '近3日均值', value: Math.round(recent3Avg), weight: 0.25 },
      { name: '上周同星期', value: sameDayLastWeek, weight: 0.25 },
      { name: '近4周同星期均值', value: Math.round(sameDay4WeekAvg), weight: 0.20 },
      { name: weekend ? '周末加成' : '非周末', value: weekend ? 0.20 : 0, weight: 0 },
      { name: holiday ? '节假日加成' : '非节日', value: holiday ? 0.30 : 0, weight: 0 },
    ],
  };
}

// ============================================================
// OMAKASE 切角单品预测
// 4个OM单品 = 4款巴斯克切角的1/3
// 没有独立的"OMAKASE"SKU，OMAKASE是拼盘概念
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
    return {
      skuId: omSkuId, storeId, date: targetDate,
      predictedSales: 0, availableStock: 0, suggestedProduction: 0,
      riskLevel: 'low', confidence: 0, factors: [],
    };
  }

  const parentName = OM_TO_PARENT[omSku.name];
  if (!parentName) {
    return {
      skuId: omSkuId, storeId, date: targetDate,
      predictedSales: 0, availableStock: 0, suggestedProduction: 0,
      riskLevel: 'low', confidence: 0, factors: [],
    };
  }

  const parentSku = skus.find(s => s.name === parentName);
  if (!parentSku) {
    return {
      skuId: omSkuId, storeId, date: targetDate,
      predictedSales: 0, availableStock: 0, suggestedProduction: 0,
      riskLevel: 'low', confidence: 0, factors: [],
    };
  }

  // 预测母品销量 × OM折算比例 = 母品 × 1/18
  const parentPrediction = predictSales(
    targetDate, storeId, parentSku.id,
    salesData, inventoryBatches, holidays, skus
  );

  const omPredicted = Math.ceil(parentPrediction.predictedSales * OM_RATIO);
  const availableStock = getAvailableStock(storeId, omSkuId, inventoryBatches);

  return {
    skuId: omSkuId,
    storeId,
    date: targetDate,
    predictedSales: omPredicted,
    availableStock,
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
      results.push(
        predictSales(targetDate, store.id, sku.id, salesData, inventoryBatches, holidays, skus)
      );
    }
  }
  return results;
}
