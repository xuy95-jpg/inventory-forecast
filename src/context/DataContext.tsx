'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Sku,
  Store,
  SalesRecord,
  InventoryBatch,
  ProductionPlan,
  Holiday,
} from '@/types';
import { mockSkus } from '@/data/mock-skus';
import { mockStores } from '@/data/mock-stores';
import { mockSalesRecords } from '@/data/mock-sales';
import { mockInventoryBatches } from '@/data/mock-inventory';
import { mockHolidays } from '@/data/mock-holidays';
import { generateId, todayStr } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

// ============================================================
// Context type
// ============================================================
interface DataContextType {
  skus: Sku[];
  stores: Store[];
  salesRecords: SalesRecord[];
  inventoryBatches: InventoryBatch[];
  productionPlans: ProductionPlan[];
  holidays: Holiday[];

  initialized: boolean;

  addSalesRecord: (record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSalesRecord: (id: string, updates: Partial<SalesRecord>) => void;
  deleteSalesRecord: (id: string) => void;
  importSalesRecords: (records: SalesRecord[]) => void;

  addInventoryBatch: (batch: Omit<InventoryBatch, 'id'>) => void;
  updateInventoryBatch: (id: string, updates: Partial<InventoryBatch>) => void;

  addProductionPlan: (plan: Omit<ProductionPlan, 'id'>) => void;
  updateProductionPlan: (id: string, updates: Partial<ProductionPlan>) => void;
  confirmProductionPlan: (id: string, actualQuantity: number, notes: string) => void;
  deleteProductionPlan: (id: string) => void;

  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (date: string) => void;

  getSkuById: (id: string) => Sku | undefined;
  getStoreById: (id: string) => Store | undefined;
  getStoreByCode: (code: string) => Store | undefined;
  getSkuByName: (name: string) => Sku | undefined;
}

const DataContext = createContext<DataContextType | null>(null);

// ============================================================
// Helper: map DB snake_case to camelCase
// ============================================================
function mapSalesRecord(row: Record<string, unknown>): SalesRecord {
  return {
    id: row.id as string,
    date: row.date as string,
    storeId: row.store_id as string,
    skuId: row.sku_id as string,
    salesQuantity: row.sales_quantity as number,
    stockQuantity: row.stock_quantity as number,
    actualProduction: row.actual_production as number | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapInventoryBatch(row: Record<string, unknown>): InventoryBatch {
  return {
    id: row.id as string,
    skuId: row.sku_id as string,
    storeId: row.store_id as string,
    productionDate: row.production_date as string,
    quantity: row.quantity as number,
    remainingQuantity: row.remaining_quantity as number,
    shelfLife: row.shelf_life as number,
    expiryDate: row.expiry_date as string,
  };
}

function mapProductionPlan(row: Record<string, unknown>): ProductionPlan {
  return {
    id: row.id as string,
    date: row.date as string,
    storeId: row.store_id as string,
    skuId: row.sku_id as string,
    suggestedQuantity: row.suggested_quantity as number,
    actualQuantity: row.actual_quantity as number,
    confirmedAt: row.confirmed_at as string | null,
    notes: row.notes as string,
  };
}

function mapHoliday(row: Record<string, unknown>): Holiday {
  return {
    date: row.date as string,
    name: row.name as string,
    isHoliday: row.is_holiday as boolean,
  };
}

// ============================================================
// Provider
// ============================================================
export function DataProvider({ children }: { children: ReactNode }) {
  const [skus] = useState<Sku[]>(mockSkus);
  const [stores] = useState<Store[]>(mockStores);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ============================================================
  // Initialize: load from Supabase, seed if empty
  // ============================================================
  useEffect(() => {
    if (initialized) return;

    async function init() {
      try {
        // Load sales records
        const { data: sales } = await supabase
          .from('sales_records').select('*').order('date', { ascending: true });

        if (sales && sales.length > 0) {
          setSalesRecords(sales.map(mapSalesRecord));
        } else {
          // Seed mock data
          console.log('🔄 首次使用，正在导入初始数据到数据库...');
          const toInsert = mockSalesRecords.map(r => ({
            id: r.id,
            date: r.date,
            store_id: r.storeId,
            sku_id: r.skuId,
            sales_quantity: r.salesQuantity,
            stock_quantity: r.stockQuantity,
            actual_production: r.actualProduction,
            created_at: r.createdAt,
            updated_at: r.updatedAt,
          }));
          // Insert in batches of 500 to avoid payload size limits
          for (let i = 0; i < toInsert.length; i += 500) {
            await supabase.from('sales_records').upsert(toInsert.slice(i, i + 500));
          }
          setSalesRecords(mockSalesRecords);
          console.log('✅ 已导入 ' + toInsert.length + ' 条销售记录');
        }

        // Load inventory
        const { data: inv } = await supabase
          .from('inventory_batches').select('*').order('production_date', { ascending: false });

        if (inv && inv.length > 0) {
          setInventoryBatches(inv.map(mapInventoryBatch));
        } else {
          const toInsert = mockInventoryBatches.map(b => ({
            id: b.id,
            sku_id: b.skuId,
            store_id: b.storeId,
            production_date: b.productionDate,
            quantity: b.quantity,
            remaining_quantity: b.remainingQuantity,
            shelf_life: b.shelfLife,
            expiry_date: b.expiryDate,
          }));
          await supabase.from('inventory_batches').upsert(toInsert);
          setInventoryBatches(mockInventoryBatches);
          console.log('✅ 已导入库存批次数据');
        }

        // Load production plans
        const { data: plans } = await supabase.from('production_plans').select('*');
        if (plans && plans.length > 0) {
          setProductionPlans(plans.map(mapProductionPlan));
        }

        // Load holidays
        const { data: hols } = await supabase.from('holidays').select('*');
        if (hols && hols.length > 0) {
          setHolidays(hols.map(mapHoliday));
        } else {
          const toInsert = mockHolidays.map(h => ({
            date: h.date,
            name: h.name,
            is_holiday: h.isHoliday,
          }));
          await supabase.from('holidays').upsert(toInsert);
          setHolidays(mockHolidays);
          console.log('✅ 已导入节假日数据');
        }

        // Seed SKU and Store master data
        const { data: existingSkus } = await supabase.from('skus').select('id').limit(1);
        if (!existingSkus || existingSkus.length === 0) {
          await supabase.from('skus').upsert(
            mockSkus.map(s => ({ id: s.id, name: s.name, category: s.category, shelf_life: s.shelfLife, unit: s.unit }))
          );
        }

        const { data: existingStores } = await supabase.from('stores').select('id').limit(1);
        if (!existingStores || existingStores.length === 0) {
          await supabase.from('stores').upsert(
            mockStores.map(s => ({ id: s.id, name: s.name, code: s.code, region: s.region }))
          );
        }
      } catch (err) {
        console.warn('⚠️ Supabase 连接失败，使用本地数据:', err);
        // Fallback to mock data if Supabase is unreachable
        setSalesRecords(mockSalesRecords);
        setInventoryBatches(mockInventoryBatches);
        setHolidays(mockHolidays);
      }

      setInitialized(true);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Sales Records CRUD
  // ============================================================
  const addSalesRecord = useCallback((record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existingId = `sales-${record.date}-${record.storeId}-${record.skuId}`;

    setSalesRecords(prev => {
      const filtered = prev.filter(r => r.id !== existingId);
      const newRec = { ...record, id: existingId, createdAt: now, updatedAt: now };
      return [...filtered, newRec];
    });

    // Async sync to Supabase
    supabase.from('sales_records').upsert({
      id: existingId,
      date: record.date,
      store_id: record.storeId,
      sku_id: record.skuId,
      sales_quantity: record.salesQuantity,
      stock_quantity: record.stockQuantity,
      actual_production: record.actualProduction,
      updated_at: now,
    }).then(({ error }) => {
      if (error) console.warn('Supabase upsert error:', error.message);
    });
  }, []);

  const updateSalesRecord = useCallback((id: string, updates: Partial<SalesRecord>) => {
    const now = new Date().toISOString();
    setSalesRecords(prev => prev.map(r => (r.id === id ? { ...r, ...updates, updatedAt: now } : r)));

    const dbUpdates: Record<string, unknown> = { updated_at: now };
    if (updates.salesQuantity !== undefined) dbUpdates.sales_quantity = updates.salesQuantity;
    if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = updates.stockQuantity;
    if (updates.actualProduction !== undefined) dbUpdates.actual_production = updates.actualProduction;

    supabase.from('sales_records').update(dbUpdates).eq('id', id).then(({ error }) => {
      if (error) console.warn('Supabase update error:', error.message);
    });
  }, []);

  const deleteSalesRecord = useCallback((id: string) => {
    setSalesRecords(prev => prev.filter(r => r.id !== id));

    supabase.from('sales_records').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn('Supabase delete error:', error.message);
    });
  }, []);

  const importSalesRecords = useCallback((records: SalesRecord[]) => {
    setSalesRecords(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const newRecords = records.filter(r => !existingIds.has(r.id));
      return [...prev, ...newRecords];
    });

    const toInsert = records.map(r => ({
      id: r.id, date: r.date, store_id: r.storeId, sku_id: r.skuId,
      sales_quantity: r.salesQuantity, stock_quantity: r.stockQuantity,
      actual_production: r.actualProduction,
      created_at: r.createdAt, updated_at: r.updatedAt,
    }));

    for (let i = 0; i < toInsert.length; i += 500) {
      supabase.from('sales_records').upsert(toInsert.slice(i, i + 500)).then(({ error }) => {
        if (error) console.warn('Supabase import error:', error.message);
      });
    }
  }, []);

  // ============================================================
  // Inventory
  // ============================================================
  const addInventoryBatch = useCallback((batch: Omit<InventoryBatch, 'id'>) => {
    const newBatch: InventoryBatch = { ...batch, id: generateId() };
    setInventoryBatches(prev => [...prev, newBatch]);

    supabase.from('inventory_batches').insert({
      id: newBatch.id, sku_id: batch.skuId, store_id: batch.storeId,
      production_date: batch.productionDate, quantity: batch.quantity,
      remaining_quantity: batch.remainingQuantity, shelf_life: batch.shelfLife,
      expiry_date: batch.expiryDate,
    }).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const updateInventoryBatch = useCallback((id: string, updates: Partial<InventoryBatch>) => {
    setInventoryBatches(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.remainingQuantity !== undefined) dbUpdates.remaining_quantity = updates.remainingQuantity;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    supabase.from('inventory_batches').update(dbUpdates).eq('id', id).then(({ error }) => {
      if (error) console.warn(error.message);
    });
  }, []);

  // ============================================================
  // Production Plans
  // ============================================================
  const addProductionPlan = useCallback((plan: Omit<ProductionPlan, 'id'>) => {
    const id = `plan-${plan.date}-${plan.storeId}-${plan.skuId}`;
    setProductionPlans(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return [...filtered, { ...plan, id }];
    });

    supabase.from('production_plans').upsert({
      id, date: plan.date, store_id: plan.storeId, sku_id: plan.skuId,
      suggested_quantity: plan.suggestedQuantity, actual_quantity: plan.actualQuantity,
      confirmed_at: plan.confirmedAt, notes: plan.notes,
    }).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const updateProductionPlan = useCallback((id: string, updates: Partial<ProductionPlan>) => {
    setProductionPlans(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.suggestedQuantity !== undefined) dbUpdates.suggested_quantity = updates.suggestedQuantity;
    if (updates.actualQuantity !== undefined) dbUpdates.actual_quantity = updates.actualQuantity;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    supabase.from('production_plans').update(dbUpdates).eq('id', id).then(({ error }) => {
      if (error) console.warn(error.message);
    });
  }, []);

  const confirmProductionPlan = useCallback((id: string, actualQuantity: number, notes: string) => {
    const now = new Date().toISOString();
    setProductionPlans(prev => prev.map(p =>
      p.id === id ? { ...p, actualQuantity, notes, confirmedAt: now } : p
    ));

    supabase.from('production_plans').update({
      actual_quantity: actualQuantity, notes, confirmed_at: now,
    }).eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const deleteProductionPlan = useCallback((id: string) => {
    setProductionPlans(prev => prev.filter(p => p.id !== id));
    supabase.from('production_plans').delete().eq('id', id).then(({ error }) => {
      if (error) console.warn(error.message);
    });
  }, []);

  // ============================================================
  // Holidays
  // ============================================================
  const addHoliday = useCallback((holiday: Holiday) => {
    setHolidays(prev => { return [...prev.filter(h => h.date !== holiday.date), holiday]; });
    supabase.from('holidays').upsert({ date: holiday.date, name: holiday.name, is_holiday: holiday.isHoliday })
      .then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const deleteHoliday = useCallback((date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
    supabase.from('holidays').delete().eq('date', date).then(({ error }) => {
      if (error) console.warn(error.message);
    });
  }, []);

  // ============================================================
  // Helpers
  // ============================================================
  const getSkuById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getStoreById = useCallback((id: string) => stores.find(s => s.id === id), [stores]);
  const getStoreByCode = useCallback((code: string) => stores.find(s => s.code === code), [stores]);
  const getSkuByName = useCallback((name: string) => skus.find(s => s.name === name), [skus]);

  const value: DataContextType = {
    skus, stores, salesRecords, inventoryBatches, productionPlans, holidays, initialized,
    addSalesRecord, updateSalesRecord, deleteSalesRecord, importSalesRecords,
    addInventoryBatch, updateInventoryBatch,
    addProductionPlan, updateProductionPlan, confirmProductionPlan, deleteProductionPlan,
    addHoliday, deleteHoliday,
    getSkuById, getStoreById, getStoreByCode, getSkuByName,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
