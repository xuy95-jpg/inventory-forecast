// ============================================================
// 核心数据类型定义
// ============================================================

/** SKU 主数据 */
export interface Sku {
  id: string;
  name: string; // e.g. "百香果巴斯克"
  category: string; // e.g. "巴斯克"
  shelfLife: number; // 保质期(天), e.g. 5
  unit: string; // "个"
}

/** 门店主数据 */
export interface Store {
  id: string;
  name: string; // e.g. "杭州万象城"
  code: string; // e.g. "HZ_MXC"
  region: string; // e.g. "杭州"
}

/** 销售记录（每日录入） */
export interface SalesRecord {
  id: string;
  date: string; // YYYY-MM-DD
  storeId: string;
  skuId: string;
  salesQuantity: number; // 切角块销量
  cutStock: number;       // 当日已切库存(块)
  wholeStock: number;     // 当日整模库存(个)
  createdAt: string;
  updatedAt: string;
}

/** 库存批次（追踪生产日期与保质期） */
export interface InventoryBatch {
  id: string;
  skuId: string;
  storeId: string;
  productionDate: string; // YYYY-MM-DD
  quantity: number; // 数量（个=整个，块=切角块）
  remainingQuantity: number; // 剩余数量
  shelfLife: number; // 保质期天数
  expiryDate: string; // YYYY-MM-DD
  batchType: 'whole' | 'cut'; // 整模 or 切角块
}

/** 生产计划 */
export interface ProductionPlan {
  id: string;
  date: string; // 生产日期 YYYY-MM-DD
  storeId: string;
  skuId: string;
  suggestedQuantity: number; // AI建议生产量
  actualQuantity: number; // 实际生产量（负责人确认）
  confirmedAt: string | null; // 确认时间
  notes: string; // 备注
}

/** 节假日配置 */
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string; // e.g. "春节"
  isHoliday: boolean;
}

/** 历史预测记录（用于准确率追踪） */
export interface PredictionRecord {
  id: string;
  date: string;           // 预测日期
  storeId: string;
  skuId: string;
  predictedTomorrowSales: number;    // AI预测明日销量
  predictedDayAfterSales: number;    // AI预测后日销量
  predictedProductionBlocks: number; // AI建议生产(块)
  predictedProductionUnits: number;  // AI建议制作(个)
  actualSales: number | null;        // 实际销量（事后填入）
  actualProduction: number | null;   // 实际生产量（事后填入）
  createdAt: string;
}

/** Dashboard 统计 */
export interface DashboardStats {
  totalStock: number;
  totalSales: number;
  suggestedProduction: number;
  riskStockCount: number;
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
  riskLevel: 'yellow' | 'red'; // yellow: 2天, red: 1天
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

/** API 响应占位（未来扩展） */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
