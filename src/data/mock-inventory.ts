import { InventoryBatch } from "@/types";

// 罐罐=整罐(罐), 巴斯克=整模(个)+切角(块), 1整模=6块

export const mockInventoryBatches: InventoryBatch[] = [
  { id: "batch-001", skuId: "sku-002", storeId: "store-001", productionDate: "2026-06-08", quantity: 11, remainingQuantity: 11, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-002", skuId: "sku-003", storeId: "store-001", productionDate: "2026-06-08", quantity: 11, remainingQuantity: 11, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-003", skuId: "sku-005", storeId: "store-001", productionDate: "2026-06-08", quantity: 8, remainingQuantity: 8, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-004", skuId: "sku-006", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-005", skuId: "sku-006", storeId: "store-001", productionDate: "2026-06-08", quantity: 5, remainingQuantity: 5, shelfLife: 5, expiryDate: "2026-06-15", batchType: "cut" },
  { id: "batch-006", skuId: "sku-008", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-007", skuId: "sku-010", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-008", skuId: "sku-010", storeId: "store-001", productionDate: "2026-06-08", quantity: 4, remainingQuantity: 4, shelfLife: 5, expiryDate: "2026-06-15", batchType: "cut" },
  { id: "batch-009", skuId: "sku-011", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-010", skuId: "sku-011", storeId: "store-001", productionDate: "2026-06-08", quantity: 6, remainingQuantity: 6, shelfLife: 5, expiryDate: "2026-06-15", batchType: "cut" },
  { id: "batch-011", skuId: "sku-012", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-012", skuId: "sku-015", storeId: "store-001", productionDate: "2026-06-08", quantity: 3, remainingQuantity: 3, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-013", skuId: "sku-015", storeId: "store-001", productionDate: "2026-06-08", quantity: 5, remainingQuantity: 5, shelfLife: 5, expiryDate: "2026-06-15", batchType: "cut" },
  { id: "batch-014", skuId: "sku-016", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-015", skuId: "sku-016", storeId: "store-001", productionDate: "2026-06-08", quantity: 4, remainingQuantity: 4, shelfLife: 5, expiryDate: "2026-06-15", batchType: "cut" },
  { id: "batch-016", skuId: "sku-018", storeId: "store-001", productionDate: "2026-06-08", quantity: 4, remainingQuantity: 4, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-017", skuId: "sku-019", storeId: "store-001", productionDate: "2026-06-08", quantity: 2, remainingQuantity: 2, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
  { id: "batch-018", skuId: "sku-019", storeId: "store-001", productionDate: "2026-06-08", quantity: 1, remainingQuantity: 1, shelfLife: 5, expiryDate: "2026-06-15", batchType: "cut" },
  { id: "batch-019", skuId: "sku-020", storeId: "store-001", productionDate: "2026-06-08", quantity: 2, remainingQuantity: 2, shelfLife: 5, expiryDate: "2026-06-15", batchType: "whole" },
];
