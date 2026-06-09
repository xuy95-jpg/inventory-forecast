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
  salesQuantity: number; // 当日销量
  stockQuantity: number; // 当日盘点库存（EOD）
  actualProduction: number | null; // 实际生产量（可选）
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

/** 库存批次（追踪生产日期与保质期） */
export interface InventoryBatch {
  id: string;
  skuId: string;
  storeId: string;
  productionDate: string; // YYYY-MM-DD
  quantity: number; // 批次生产数量
  remainingQuantity: number; // 批次剩余数量
  shelfLife: number; // 保质期天数（从SKU复制）
  expiryDate: string; // YYYY-MM-DD = productionDate + shelfLife
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

/** 预测结果 */
export interface PredictionResult {
  skuId: string;
  storeId: string;
  date: string;
  predictedSales: number; // 预测销量
  availableStock: number; // 可售库存
  suggestedProduction: number; // 建议生产量
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  confidence: number; // 置信度 0-1
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  value: number;
  weight: number;
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
