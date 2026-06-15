import { InventoryBatch, RiskItem } from '@/types';
import { daysUntilExpiry } from './helpers';

/** 获取切角+整模分开的库存 */
export function getSplitStock(batches: InventoryBatch[], storeId: string, skuId: string): { cut: number; whole: number; total: number } {
  let cut = 0, whole = 0;
  for (const b of batches) {
    if (b.storeId !== storeId || b.skuId !== skuId || b.remainingQuantity <= 0) continue;
    if (b.batchType === 'cut') cut += b.remainingQuantity;
    else whole += b.remainingQuantity;
  }
  return { cut, whole, total: cut + whole * 6 };
}

/** 所有门店总库存（6寸等价块数） */
export function getAllStoresTotalStock(batches: InventoryBatch[]): number {
  let total = 0;
  for (const b of batches) {
    if (b.remainingQuantity <= 0) continue;
    total += b.batchType === 'cut' ? b.remainingQuantity : b.remainingQuantity * 6;
  }
  return total;
}

/** 风险库存列表 */
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
