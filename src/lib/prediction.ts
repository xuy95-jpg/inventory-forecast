import { SalesRecord, Sku, Holiday, InventoryBatch } from '@/types';
import { addDays } from './helpers';

// ============================================================
// AI 预测引擎 V5 — 库存流转模拟
//
// 不是直接"库存 - 需求"，而是逐日模拟 FIFO 消耗：
//
//   Day 0（今天）: 所有未过期批次，按到期日排序
//   Day 1（明天）: 预测销量 → FIFO 消耗最老的 → 剩余库存
//   Day 2（后天）: 预测销量 → FIFO 消耗剩余的 → 最终剩余
//
//   生产量 = ceil(最终缺口 / multiplier)
//
// 生产阈值（基于近30天日均）：
//   大款(日均≥12): 缺口>1块 → ceil(缺口÷6)个
//   中款(日均≥5):  缺口>3块 → ceil(缺口÷6)个
//   小款(日均<5):  缺口>4块 → ceil(缺口÷6)个
// ============================================================

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
  afterTomorrow: number;    // FIFO模拟明天结束后剩余(块)
  afterDayAfter: number;    // FIFO模拟后天结束后剩余(块)
  shortage: number;         // 缺口(块)
  suggestedBlocks: number;
  suggestedUnits: number;
  tier: string;
  threshold: number;
  dailyAvg: number;
  riskLevel: 'low' | 'medium' | 'high';
  isOmakase: boolean;
}

// ============================================================
// 内部：模拟一天的 FIFO 消耗
// ============================================================

interface SimBatch {
  blocks: number;         // 等价块数
  expiryDate: string;     // 到期日
}

/** 模拟一天：从 batches 中按到期日顺序消耗 salesBlocks 块，返回剩余 */
function simulateDay(batches: SimBatch[], salesBlocks: number): { remaining: SimBatch[]; consumed: number; unmet: number } {
  // Sort FIFO: earliest expiry first
  const sorted = [...batches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  let left = salesBlocks;
  const remaining: SimBatch[] = [];

  for (const b of sorted) {
    if (left <= 0) { remaining.push(b); continue; }
    if (b.blocks <= left) {
      left -= b.blocks;
    } else {
      remaining.push({ blocks: b.blocks - left, expiryDate: b.expiryDate });
      left = 0;
    }
  }

  return { remaining, consumed: salesBlocks - left, unmet: left };
}

// ============================================================
// 内部：从 InventoryBatch[] 构建 SimBatch[]（过滤已过期）
// ============================================================

function buildSimBatches(storeId: string, skuId: string, batches: InventoryBatch[], forDate: string, skuCategory: string): SimBatch[] {
  const sim: SimBatch[] = [];
  for (const b of batches) {
    if (b.storeId !== storeId || b.skuId !== skuId || b.remainingQuantity <= 0) continue;
    // 只算在 forDate 之前生产的
    if (b.productionDate > forDate) continue;
    // 不能在 forDate 之前已经过期
    if (b.expiryDate < forDate) continue;
    const multiplier = (skuCategory === '罐罐' || skuCategory === 'OMAKASE') ? 1 : (b.batchType === 'cut' ? 1 : 6);
    sim.push({ blocks: b.remainingQuantity * multiplier, expiryDate: b.expiryDate });
  }
  return sim;
}

function sumBlocks(batches: SimBatch[]): number {
  return batches.reduce((s, b) => s + b.blocks, 0);
}

// ============================================================
// 内部：销售预测
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

function getThreshold(dailyAvg: number): { tier: string; threshold: number } {
  if (dailyAvg >= 12) return { tier: '大款', threshold: 1 };
  if (dailyAvg >= 5) return { tier: '中款', threshold: 3 };
  return { tier: '小款', threshold: 4 };
}

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
// 主预测函数 — 逐日 FIFO 库存模拟
// ============================================================

export function predictTwoDay(
  productionDate: string,
  storeId: string,
  skuId: string,
  salesData: SalesRecord[],
  inventoryBatches: InventoryBatch[],
  skuCategory?: string,
): TwoDayPrediction {
  const cat = skuCategory || '6寸巴斯克';
  const isCanned = cat === '罐罐';
  const isOmakase = cat === 'OMAKASE';
  const today = productionDate;
  const tomorrow = addDays(today, 0); // Day0 = production day itself
  const dayAfter = addDays(today, 1);

  // Step 1: 预测两日销量
  const tomorrowSales = predictSingleDay(tomorrow, storeId, skuId, salesData);
  const dayAfterSales = predictSingleDay(dayAfter, storeId, skuId, salesData);

  // Step 2: 构建从 productionDate 起的活跃批次
  const initialBatches = buildSimBatches(storeId, skuId, inventoryBatches, today, cat);
  const initialTotal = sumBlocks(initialBatches);
  const initialCut = inventoryBatches
    .filter(b => b.storeId === storeId && b.skuId === skuId && b.batchType === 'cut' && b.productionDate <= today && b.expiryDate >= today)
    .reduce((s, b) => s + b.remainingQuantity, 0);
  const initialWhole = inventoryBatches
    .filter(b => b.storeId === storeId && b.skuId === skuId && b.batchType === 'whole' && b.productionDate <= today && b.expiryDate >= today)
    .reduce((s, b) => s + b.remainingQuantity, 0);

  // Step 3: 模拟 Day 1 — 明天
  const day1 = simulateDay(initialBatches, tomorrowSales);
  const afterTomorrow = sumBlocks(day1.remaining);

  // Step 4: 模拟 Day 2 — 后天（从 Day1 剩余开始）
  const day2 = simulateDay(day1.remaining, dayAfterSales);
  const afterDayAfter = sumBlocks(day2.remaining);

  // Step 5: 缺口 = 后天模拟后仍未满足的需求 + 明天未满足的
  const shortage = day1.unmet + day2.unmet;

  // Step 6: 阈值生产建议
  const dailyAvg = getDailyAvg(storeId, skuId, salesData);
  const { tier, threshold } = getThreshold(dailyAvg);
  const multiplier = isCanned ? 1 : 6;
  let suggestedUnits = 0;
  if (shortage > threshold) suggestedUnits = Math.ceil(shortage / multiplier);
  if (isOmakase) suggestedUnits = 0;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const ratio = initialTotal > 0 ? afterDayAfter / Math.max(1, tomorrowSales + dayAfterSales) : 999;
  if (ratio < 0.3) riskLevel = 'high';
  else if (ratio < 0.6) riskLevel = 'medium';

  return {
    skuId, storeId, date: productionDate,
    tomorrowSales, dayAfterSales, twoDayTotal: tomorrowSales + dayAfterSales,
    cutStock: initialCut, wholeStock: initialWhole, totalStock: initialTotal,
    afterTomorrow, afterDayAfter,
    shortage, suggestedBlocks: shortage > threshold ? shortage : 0, suggestedUnits,
    tier, threshold, dailyAvg,
    riskLevel, isOmakase,
  };
}

// ============================================================
// OMAKASE 折算
// ============================================================

const OM_PARENTS = ['咸芝士', '香爆了', '苦巧碎银子', '牛肝菌'];
const OM_RATIO = 1 / 18;

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
