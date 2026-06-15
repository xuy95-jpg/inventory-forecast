import { InventoryBatch, RiskItem } from '@/types';
import { daysUntilExpiry } from './helpers';

/**
 * 获取分维度库存
 * 巴斯克: 切角(块) + 整模(个)×6
 * 罐罐:   整罐(个)×1
 */
export function getSplitStock(batches: InventoryBatch[], storeId: string, skuId: string, skuCategory: string): { cut: number; whole: number; total: number } {
  let cut = 0, whole = 0;

  for (const b of batches) {
    if (b.storeId !== storeId || b.skuId !== skuId || b.remainingQuantity <= 0) continue;
    if (b.batchType === 'cut') cut += b.remainingQuantity;
    else whole += b.remainingQuantity;
  }

  if (skuCategory === '罐罐') {
    // 罐罐：whole = 罐数，1罐=1个销售单位
    return { cut: 0, whole, total: whole };
  }

  // 巴斯克/OMAKASE：整模×6 + 切角
  return { cut, whole, total: cut + whole * 6 };
}

/** 所有门店总库存（等价块数：巴斯克×6，罐罐×1） */
export function getAllStoresTotalStock(batches: InventoryBatch[], skuCategoryMap: Map<string, string>): number {
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
