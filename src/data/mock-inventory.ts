import { InventoryBatch } from "@/types";

// 逐日FIFO扣减 + 当天过期移除

export const mockInventoryBatches: InventoryBatch[] = [
  { id: "b073", skuId: "sku-013", storeId: "store-001", productionDate: "2026-06-22", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-26", batchType: "whole" },
  { id: "b074", skuId: "sku-020", storeId: "store-001", productionDate: "2026-06-22", quantity: 2, remainingQuantity: 2, shelfLife: 4, expiryDate: "2026-06-26", batchType: "cut" },
  { id: "b089", skuId: "sku-021", storeId: "store-001", productionDate: "2026-06-22", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-26", batchType: "cut" },
  { id: "b090", skuId: "sku-021", storeId: "store-001", productionDate: "2026-06-23", quantity: 2, remainingQuantity: 2, shelfLife: 4, expiryDate: "2026-06-27", batchType: "whole" },
  { id: "b091", skuId: "sku-021", storeId: "store-001", productionDate: "2026-06-22", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-26", batchType: "whole" },
  { id: "b092", skuId: "sku-013", storeId: "store-001", productionDate: "2026-06-23", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-27", batchType: "whole" },
  { id: "b094", skuId: "sku-016", storeId: "store-001", productionDate: "2026-06-23", quantity: 8, remainingQuantity: 8, shelfLife: 3, expiryDate: "2026-06-26", batchType: "cut" },
  { id: "b095", skuId: "sku-019", storeId: "store-001", productionDate: "2026-06-23", quantity: 2, remainingQuantity: 2, shelfLife: 3, expiryDate: "2026-06-26", batchType: "cut" },
];
