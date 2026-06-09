-- ============================================================
-- NANA 备货预测系统 数据库建表 SQL
-- 在 Supabase SQL Editor 粘贴全部执行
-- ============================================================

-- 1. 门店主数据
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT '杭州'
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读取门店" ON stores FOR SELECT USING (true);
CREATE POLICY "允许公开写入门店" ON stores FOR INSERT WITH CHECK (true);
CREATE POLICY "允许公开更新门店" ON stores FOR UPDATE USING (true);
CREATE POLICY "允许公开删除门店" ON stores FOR DELETE USING (true);

-- 2. SKU 主数据
CREATE TABLE IF NOT EXISTS skus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  shelf_life INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT '个'
);
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读取SKU" ON skus FOR SELECT USING (true);
CREATE POLICY "允许公开写入SKU" ON skus FOR INSERT WITH CHECK (true);
CREATE POLICY "允许公开更新SKU" ON skus FOR UPDATE USING (true);
CREATE POLICY "允许公开删除SKU" ON skus FOR DELETE USING (true);

-- 3. 销售记录
CREATE TABLE IF NOT EXISTS sales_records (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  store_id TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  sales_quantity REAL NOT NULL DEFAULT 0,
  stock_quantity REAL NOT NULL DEFAULT 0,
  actual_production REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_records(date);
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales_records(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_sku ON sales_records(sku_id);
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读取销售" ON sales_records FOR SELECT USING (true);
CREATE POLICY "允许公开写入销售" ON sales_records FOR INSERT WITH CHECK (true);
CREATE POLICY "允许公开更新销售" ON sales_records FOR UPDATE USING (true);
CREATE POLICY "允许公开删除销售" ON sales_records FOR DELETE USING (true);

-- 4. 库存批次
CREATE TABLE IF NOT EXISTS inventory_batches (
  id TEXT PRIMARY KEY,
  sku_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  production_date DATE NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  remaining_quantity REAL NOT NULL DEFAULT 0,
  shelf_life INTEGER NOT NULL DEFAULT 5,
  expiry_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_batch_sku ON inventory_batches(sku_id);
CREATE INDEX IF NOT EXISTS idx_batch_store ON inventory_batches(store_id);
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读取库存" ON inventory_batches FOR SELECT USING (true);
CREATE POLICY "允许公开写入库存" ON inventory_batches FOR INSERT WITH CHECK (true);
CREATE POLICY "允许公开更新库存" ON inventory_batches FOR UPDATE USING (true);
CREATE POLICY "允许公开删除库存" ON inventory_batches FOR DELETE USING (true);

-- 5. 生产计划
CREATE TABLE IF NOT EXISTS production_plans (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  store_id TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  suggested_quantity REAL NOT NULL DEFAULT 0,
  actual_quantity REAL NOT NULL DEFAULT 0,
  confirmed_at TIMESTAMPTZ,
  notes TEXT DEFAULT ''
);
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读取生产计划" ON production_plans FOR SELECT USING (true);
CREATE POLICY "允许公开写入生产计划" ON production_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "允许公开更新生产计划" ON production_plans FOR UPDATE USING (true);
CREATE POLICY "允许公开删除生产计划" ON production_plans FOR DELETE USING (true);

-- 6. 节假日配置
CREATE TABLE IF NOT EXISTS holidays (
  date DATE PRIMARY KEY,
  name TEXT NOT NULL,
  is_holiday BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许公开读取节假日" ON holidays FOR SELECT USING (true);
CREATE POLICY "允许公开写入节假日" ON holidays FOR INSERT WITH CHECK (true);
CREATE POLICY "允许公开删除节假日" ON holidays FOR DELETE USING (true);
