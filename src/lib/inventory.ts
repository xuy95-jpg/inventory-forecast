import { InventoryBatch, SalesRecord, RiskItem } from '@/types';
import { daysUntilExpiry } from './helpers';

/**
 * 获取分维度库存
 * 按日期回溯：找最近一次盘点数据（切角库存+整模库存）
 * 巴斯克: 切角(块) + 整模(个)×6
 * 罐罐:   整罐×1
 */
export function getSplitStock(
  storeId: string,
  skuId: string,
  salesRecords: SalesRecord[],
  skuCategory: string,
  forDate?: string,
): { cut: number; whole: number; total: number } {
  let best: SalesRecord | undefined;
  for (const r of salesRecords) {
    if (r.storeId !== storeId || r.skuId !== skuId) continue;
    if (r.cutStock <= 0 && r.wholeStock <= 0) continue;
    if (forDate && r.date > forDate) continue;
    if (!best || r.date > best.date) best = r;
  }

  const cut = best?.cutStock || 0;
  const whole = best?.wholeStock || 0;

  if (skuCategory === '罐罐') return { cut: 0, whole, total: cut };
  return { cut, whole, total: cut + whole * 6 };
}

/** 所有门店总库存（等价块数） */
export function getAllStoresTotalStock(
  batches: InventoryBatch[],
  salesRecords: SalesRecord[],
  skuCategoryMap: Map<string, string>,
): number {
  let total = 0;
  for (const b of batches) {
    if (b.remainingQuantity <= 0) continue;
    const cat = skuCategoryMap.get(b.skuId) || '';
    if (b.batchType === 'cut') { total += b.remainingQuantity; }
    else { total += b.remainingQuantity * (cat === '罐罐' ? 1 : 6); }
  }
  return total;
}

/** 风险库存 */
export function getRiskItems(batches: InventoryBatch[], skuMap: Map<string, string>, storeMap: Map<string, string>): RiskItem[] {
  const items: RiskItem[] = [];
  for (const b of batches) {
    if (b.remainingQuantity <= 0) continue;
    const daysLeft = daysUntilExpiry(b.expiryDate);
    if (daysLeft <= 2) {
      items.push({
        batchId: b.id, skuId: b.skuId,
        skuName: skuMap.get(b.skuId) || b.skuId,
        storeId: b.storeId,
        storeName: storeMap.get(b.storeId) || b.storeId,
        remainingQuantity: b.remainingQuantity,
        daysUntilExpiry: daysLeft,
        riskLevel: daysLeft <= 1 ? 'red' : 'yellow',
      });
    }
  }
  return items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}
