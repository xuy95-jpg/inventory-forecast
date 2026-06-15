-- ============================================================
-- NANA v5 数据库更新 SQL
-- 在 Supabase SQL Editor 粘贴全部执行
-- ============================================================

-- 1. 更新 sales_records 表（新增 cut_stock, whole_stock 替代 stock_quantity）
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS cut_stock REAL DEFAULT 0;
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS whole_stock REAL DEFAULT 0;

-- 2. 更新 inventory_batches 表（新增 batch_type: whole/cut）
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS batch_type TEXT DEFAULT 'whole';

-- 3. 新建 prediction_records 表（历史预测追踪）
CREATE TABLE IF NOT EXISTS prediction_records (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  store_id TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  predicted_tomorrow_sales REAL NOT NULL DEFAULT 0,
  predicted_day_after_sales REAL NOT NULL DEFAULT 0,
  predicted_production_blocks REAL NOT NULL DEFAULT 0,
  predicted_production_units REAL NOT NULL DEFAULT 0,
  actual_sales REAL,
  actual_production REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE prediction_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读写预测记录" ON prediction_records FOR ALL USING (true);

-- 4. 更新 production_plans 表（如果缺字段）
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
