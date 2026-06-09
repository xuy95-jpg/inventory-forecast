'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Sku, Store, SalesRecord, InventoryBatch, ProductionPlan, Holiday } from '@/types';
import { mockSkus } from '@/data/mock-skus';
import { mockStores } from '@/data/mock-stores';
import { mockSalesRecords } from '@/data/mock-sales';
import { mockInventoryBatches } from '@/data/mock-inventory';
import { mockHolidays } from '@/data/mock-holidays';
import { generateId } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

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

export function DataProvider({ children }: { children: ReactNode }) {
  const [skus] = useState<Sku[]>(mockSkus);
  const [stores] = useState<Store[]>(mockStores);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ============================================================
  // Init: load from Supabase, re-seed if data version changed
  // ============================================================
  useEffect(() => {
    if (initialized) return;
    init();
    async function init() {
      const VER = 'v3'; // bump to force re-seed
      const localVer = typeof window !== 'undefined' ? localStorage.getItem('data_version') : null;

      try {
        if (localVer !== VER) {
          // Version changed — clear old Supabase data and re-seed
          await supabase.from('sales_records').delete().neq('id', '_x_');
          await supabase.from('inventory_batches').delete().neq('id', '_x_');

          const s = mockSalesRecords.map(r => ({
            id: r.id, date: r.date, store_id: r.storeId, sku_id: r.skuId,
            sales_quantity: r.salesQuantity, stock_quantity: r.stockQuantity,
            actual_production: r.actualProduction, created_at: r.createdAt, updated_at: r.updatedAt,
          }));
          for (let i = 0; i < s.length; i += 500) {
            await supabase.from('sales_records').upsert(s.slice(i, i + 500));
          }

          await supabase.from('inventory_batches').upsert(mockInventoryBatches.map(b => ({
            id: b.id, sku_id: b.skuId, store_id: b.storeId,
            production_date: b.productionDate, quantity: b.quantity,
            remaining_quantity: b.remainingQuantity, shelf_life: b.shelfLife, expiry_date: b.expiryDate,
          })));
          await supabase.from('holidays').upsert(mockHolidays.map(h => ({ date: h.date, name: h.name, is_holiday: h.isHoliday })));
          await supabase.from('skus').upsert(mockSkus.map(sk => ({ id: sk.id, name: sk.name, category: sk.category, shelf_life: sk.shelfLife, unit: sk.unit })));
          await supabase.from('stores').upsert(mockStores.map(st => ({ id: st.id, name: st.name, code: st.code, region: st.region })));

          localStorage.setItem('data_version', VER);
          console.log('✅ 数据已更新 (v3, ' + s.length + ' 条)');
        } else {
          console.log('📦 数据版本 ' + VER + '，无需更新');
        }
      } catch (err) {
        console.warn('⚠️ Supabase 连接失败，使用本地数据');
      }

      setSalesRecords(mockSalesRecords);
      setInventoryBatches(mockInventoryBatches);
      setHolidays(mockHolidays);
      setInitialized(true);
    }
  }, []);

  // ============================================================
  // CRUD
  // ============================================================
  const addSalesRecord = useCallback((record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const id = `sales-${record.date}-${record.storeId}-${record.skuId}`;
    setSalesRecords(prev => [...prev.filter(r => r.id !== id), { ...record, id, createdAt: now, updatedAt: now }]);
    supabase.from('sales_records').upsert({ id, date: record.date, store_id: record.storeId, sku_id: record.skuId, sales_quantity: record.salesQuantity, stock_quantity: record.stockQuantity, actual_production: record.actualProduction, updated_at: now }).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const updateSalesRecord = useCallback((id: string, updates: Partial<SalesRecord>) => {
    setSalesRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
    const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.salesQuantity !== undefined) u.sales_quantity = updates.salesQuantity;
    if (updates.stockQuantity !== undefined) u.stock_quantity = updates.stockQuantity;
    supabase.from('sales_records').update(u).eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const deleteSalesRecord = useCallback((id: string) => {
    setSalesRecords(prev => prev.filter(r => r.id !== id));
    supabase.from('sales_records').delete().eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const importSalesRecords = useCallback((records: SalesRecord[]) => {
    setSalesRecords(prev => { const ids = new Set(prev.map(r => r.id)); return [...prev, ...records.filter(r => !ids.has(r.id))]; });
    const ins = records.map(r => ({ id: r.id, date: r.date, store_id: r.storeId, sku_id: r.skuId, sales_quantity: r.salesQuantity, stock_quantity: r.stockQuantity, actual_production: r.actualProduction, created_at: r.createdAt, updated_at: r.updatedAt }));
    for (let i = 0; i < ins.length; i += 500) supabase.from('sales_records').upsert(ins.slice(i, i + 500)).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const addInventoryBatch = useCallback((batch: Omit<InventoryBatch, 'id'>) => {
    const b: InventoryBatch = { ...batch, id: generateId() };
    setInventoryBatches(prev => [...prev, b]);
    supabase.from('inventory_batches').insert({ id: b.id, sku_id: b.skuId, store_id: b.storeId, production_date: b.productionDate, quantity: b.quantity, remaining_quantity: b.remainingQuantity, shelf_life: b.shelfLife, expiry_date: b.expiryDate }).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const updateInventoryBatch = useCallback((id: string, updates: Partial<InventoryBatch>) => {
    setInventoryBatches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    const u: Record<string, unknown> = {};
    if (updates.remainingQuantity !== undefined) u.remaining_quantity = updates.remainingQuantity;
    supabase.from('inventory_batches').update(u).eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const addProductionPlan = useCallback((plan: Omit<ProductionPlan, 'id'>) => {
    const id = `plan-${plan.date}-${plan.storeId}-${plan.skuId}`;
    setProductionPlans(prev => [...prev.filter(p => p.id !== id), { ...plan, id }]);
    supabase.from('production_plans').upsert({ id, date: plan.date, store_id: plan.storeId, sku_id: plan.skuId, suggested_quantity: plan.suggestedQuantity, actual_quantity: plan.actualQuantity, confirmed_at: plan.confirmedAt, notes: plan.notes }).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const updateProductionPlan = useCallback((id: string, updates: Partial<ProductionPlan>) => {
    setProductionPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const u: Record<string, unknown> = {};
    if (updates.suggestedQuantity !== undefined) u.suggested_quantity = updates.suggestedQuantity;
    if (updates.actualQuantity !== undefined) u.actual_quantity = updates.actualQuantity;
    if (updates.notes !== undefined) u.notes = updates.notes;
    supabase.from('production_plans').update(u).eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const confirmProductionPlan = useCallback((id: string, actualQuantity: number, notes: string) => {
    const now = new Date().toISOString();
    setProductionPlans(prev => prev.map(p => p.id === id ? { ...p, actualQuantity, notes, confirmedAt: now } : p));
    supabase.from('production_plans').update({ actual_quantity: actualQuantity, notes, confirmed_at: now }).eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const deleteProductionPlan = useCallback((id: string) => {
    setProductionPlans(prev => prev.filter(p => p.id !== id));
    supabase.from('production_plans').delete().eq('id', id).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const addHoliday = useCallback((holiday: Holiday) => {
    setHolidays(prev => [...prev.filter(h => h.date !== holiday.date), holiday]);
    supabase.from('holidays').upsert({ date: holiday.date, name: holiday.name, is_holiday: holiday.isHoliday }).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const deleteHoliday = useCallback((date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
    supabase.from('holidays').delete().eq('date', date).then(({ error }) => { if (error) console.warn(error.message); });
  }, []);

  const getSkuById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getStoreById = useCallback((id: string) => stores.find(s => s.id === id), [stores]);
  const getStoreByCode = useCallback((code: string) => stores.find(s => s.code === code), [stores]);
  const getSkuByName = useCallback((name: string) => skus.find(s => s.name === name), [skus]);

  return (
    <DataContext.Provider value={{
      skus, stores, salesRecords, inventoryBatches, productionPlans, holidays, initialized,
      addSalesRecord, updateSalesRecord, deleteSalesRecord, importSalesRecords,
      addInventoryBatch, updateInventoryBatch,
      addProductionPlan, updateProductionPlan, confirmProductionPlan, deleteProductionPlan,
      addHoliday, deleteHoliday,
      getSkuById, getStoreById, getStoreByCode, getSkuByName,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData must be used within a DataProvider');
  return c;
}
