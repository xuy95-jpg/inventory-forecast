import { InventoryBatch } from "@/types";

// 已FIFO扣减6/18-6/23销量，只保留有剩余未过期的批次

export const mockInventoryBatches: InventoryBatch[] = [
  { id: "b-073", skuId: "sku-013", storeId: "store-001", productionDate: "2026-06-22", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-26", batchType: "whole" },
  { id: "b-074", skuId: "sku-020", storeId: "store-001", productionDate: "2026-06-22", quantity: 2, remainingQuantity: 2, shelfLife: 4, expiryDate: "2026-06-26", batchType: "cut" },
  { id: "b-089", skuId: "sku-021", storeId: "store-001", productionDate: "2026-06-22", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-26", batchType: "cut" },
  { id: "b-090", skuId: "sku-021", storeId: "store-001", productionDate: "2026-06-23", quantity: 2, remainingQuantity: 2, shelfLife: 4, expiryDate: "2026-06-27", batchType: "whole" },
  { id: "b-091", skuId: "sku-021", storeId: "store-001", productionDate: "2026-06-22", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-26", batchType: "whole" },
  { id: "b-092", skuId: "sku-013", storeId: "store-001", productionDate: "2026-06-23", quantity: 1, remainingQuantity: 1, shelfLife: 4, expiryDate: "2026-06-27", batchType: "whole" },
  { id: "b-094", skuId: "sku-016", storeId: "store-001", productionDate: "2026-06-23", quantity: 8, remainingQuantity: 8, shelfLife: 3, expiryDate: "2026-06-26", batchType: "cut" },
  { id: "b-095", skuId: "sku-019", storeId: "store-001", productionDate: "2026-06-23", quantity: 2, remainingQuantity: 2, shelfLife: 3, expiryDate: "2026-06-26", batchType: "cut" },
];
