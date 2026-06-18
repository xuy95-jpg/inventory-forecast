// ============================================================
// 核心数据类型定义
// ============================================================

/** SKU 主数据 */
export interface Sku {
  id: string;
  name: string;
  category: string;
  shelfLife: number;
  unit: string;
  active: boolean; // 是否在售
}

/** 门店主数据 */
export interface Store {
  id: string;
  name: string;
  code: string;
  region: string;
}

/** 销售记录（每日录入） */
export interface SalesRecord {
  id: string;
  date: string;
  storeId: string;
  skuId: string;
  salesQuantity: number;
  cutStock: number;
  wholeStock: number;
  wastage: number;        // 报损量(块)
  soldOut: boolean;       // 是否售罄
  createdAt: string;
  updatedAt: string;
}

/** 库存批次 */
export interface InventoryBatch {
  id: string;
  skuId: string;
  storeId: string;
  productionDate: string;
  quantity: number;
  remainingQuantity: number;
  shelfLife: number;
  expiryDate: string;
  batchType: 'whole' | 'cut';
}

/** 生产计划 */
export interface ProductionPlan {
  id: string;
  date: string;
  storeId: string;
  skuId: string;
  suggestedQuantity: number;
  actualQuantity: number;
  confirmedAt: string | null;
  notes: string;
}

/** 节假日配置 */
export interface Holiday {
  date: string;
  name: string;
  isHoliday: boolean;
}

/** 历史预测记录（用于准确率追踪+AI调优） */
export interface PredictionRecord {
  id: string;
  date: string;
  storeId: string;
  skuId: string;
  predictedTomorrowSales: number;
  predictedDayAfterSales: number;
  predictedProductionBlocks: number;
  predictedProductionUnits: number;
  actualSales: number | null;
  actualProduction: number | null;
  wastage: number;        // 报损量
  soldOut: boolean;       // 售罄
  createdAt: string;
}

/** 风险库存项 */
export interface RiskItem {
  batchId: string;
  skuId: string;
  skuName: string;
  storeId: string;
  storeName: string;
  remainingQuantity: number;
  daysUntilExpiry: number;
  riskLevel: 'yellow' | 'red';
}

/** CSV 导入行 */
export interface CsvImportRow {
  date: string;
  storeCode: string;
  skuName: string;
  salesQuantity: number;
  stockQuantity: number;
  actualProduction?: number;
}
