import { InventoryBatch, SalesRecord, ProductionPlan, Sku, RiskItem } from '@/types';
import { todayStr, daysUntilExpiry } from './helpers';

/**
 * 库存管理工具
 */

/** 获取某个门店某个SKU的总可售库存 */
export function getTotalStock(
  storeId: string,
  skuId: string,
  batches: InventoryBatch[]
): number {
  return batches
    .filter(b => b.storeId === storeId && b.skuId === skuId && b.remainingQuantity > 0)
    .reduce((sum, b) => sum + b.remainingQuantity, 0);
}

/** 获取所有门店的总库存 */
export function getAllStoresTotalStock(batches: InventoryBatch[]): number {
  return batches
    .filter(b => b.remainingQuantity > 0)
    .reduce((sum, b) => sum + b.remainingQuantity, 0);
}

/** 获取风险库存列表（即将过期） */
export function getRiskItems(
  batches: InventoryBatch[],
  skuMap: Map<string, string>, // skuId -> skuName
  storeMap: Map<string, string> // storeId -> storeName
): RiskItem[] {
  const riskItems: RiskItem[] = [];

  for (const batch of batches) {
    if (batch.remainingQuantity <= 0) continue;

    const daysLeft = daysUntilExpiry(batch.expiryDate);

    if (daysLeft <= 1) {
      riskItems.push({
        batchId: batch.id,
        skuId: batch.skuId,
        skuName: skuMap.get(batch.skuId) || batch.skuId,
        storeId: batch.storeId,
        storeName: storeMap.get(batch.storeId) || batch.storeId,
        remainingQuantity: batch.remainingQuantity,
        daysUntilExpiry: daysLeft,
        riskLevel: 'red',
      });
    } else if (daysLeft <= 2) {
      riskItems.push({
        batchId: batch.id,
        skuId: batch.skuId,
        skuName: skuMap.get(batch.skuId) || batch.skuId,
        storeId: batch.storeId,
        storeName: storeMap.get(batch.storeId) || batch.storeId,
        remainingQuantity: batch.remainingQuantity,
        daysUntilExpiry: daysLeft,
        riskLevel: 'yellow',
      });
    }
  }

  return riskItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/** 从生产计划创建库存批次 */
export function createBatchFromPlan(
  plan: ProductionPlan,
  sku: Sku
): InventoryBatch {
  const productionDate = plan.date;
  const d = new Date(productionDate);
  d.setDate(d.getDate() + sku.shelfLife);
  const expiryDate = d.toISOString().split('T')[0];

  return {
    id: `batch-${plan.storeId}-${plan.skuId}-${productionDate}`,
    skuId: plan.skuId,
    storeId: plan.storeId,
    productionDate,
    quantity: plan.actualQuantity,
    remainingQuantity: plan.actualQuantity,
    shelfLife: sku.shelfLife,
    expiryDate,
  };
}

/** 库存滚动：根据销售记录扣减库存 */
export function rollInventory(
  batches: InventoryBatch[],
  salesRecords: SalesRecord[]
): InventoryBatch[] {
  const updated = batches.map(b => ({ ...b }));

  for (const record of salesRecords) {
    let remaining = record.salesQuantity;
    // 从最早的批次开始扣减（FIFO）
    const storeBatches = updated
      .filter(b => b.storeId === record.storeId && b.skuId === record.skuId && b.remainingQuantity > 0)
      .sort((a, b) => a.productionDate.localeCompare(b.productionDate));

    for (const batch of storeBatches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.remainingQuantity, remaining);
      batch.remainingQuantity -= deduct;
      remaining -= deduct;
    }
  }

  return updated;
}
