'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Sku, Store, SalesRecord, InventoryBatch, ProductionPlan, Holiday, PredictionRecord } from '@/types';
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
  predictionRecords: PredictionRecord[];
  holidays: Holiday[];
  initialized: boolean;
  addSalesRecords: (records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  addInventoryBatch: (batch: Omit<InventoryBatch, 'id'>) => void;
  updateInventoryBatch: (id: string, updates: Partial<InventoryBatch>) => void;
  saveProductionPlan: (plan: Omit<ProductionPlan, 'id'>) => void;
  savePredictionRecords: (records: Omit<PredictionRecord, 'id'>[]) => void;
  toggleSkuActive: (skuId: string) => void;
  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (date: string) => void;
  getSkuById: (id: string) => Sku | undefined;
  getStoreById: (id: string) => Store | undefined;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [skus, setSkus] = useState<Sku[]>(mockSkus);
  const [stores] = useState<Store[]>(mockStores);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [predictionRecords, setPredictionRecords] = useState<PredictionRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    const VER = 'v8';
    const localVer = typeof window !== 'undefined' ? localStorage.getItem('data_version') : null;

    async function init() {
      try {
        if (localVer !== VER) {
          await supabase.from('sales_records').delete().neq('id', '_x_');
          await supabase.from('inventory_batches').delete().neq('id', '_x_');
          for (let i = 0; i < mockSalesRecords.length; i += 500) {
            await supabase.from('sales_records').upsert(
              mockSalesRecords.slice(i, i + 500).map(r => ({
                id: r.id, date: r.date, store_id: r.storeId, sku_id: r.skuId,
                sales_quantity: r.salesQuantity, cut_stock: r.cutStock, whole_stock: r.wholeStock,
                wastage: r.wastage, sold_out: r.soldOut,
                created_at: r.createdAt, updated_at: r.updatedAt,
              }))
            );
          }
          await supabase.from('inventory_batches').upsert(mockInventoryBatches.map(b => ({
            id: b.id, sku_id: b.skuId, store_id: b.storeId, production_date: b.productionDate,
            quantity: b.quantity, remaining_quantity: b.remainingQuantity, shelf_life: b.shelfLife,
            expiry_date: b.expiryDate, batch_type: b.batchType,
          })));
          await supabase.from('holidays').upsert(mockHolidays.map(h => ({ date: h.date, name: h.name, is_holiday: h.isHoliday })));
          await supabase.from('skus').upsert(mockSkus.map(s => ({ id: s.id, name: s.name, category: s.category, shelf_life: s.shelfLife, unit: s.unit, active: s.active })));
          await supabase.from('stores').upsert(mockStores.map(s => ({ id: s.id, name: s.name, code: s.code, region: s.region })));
          localStorage.setItem('data_version', VER);
        }
        setSalesRecords(mockSalesRecords);
        setInventoryBatches(mockInventoryBatches);
        setHolidays(mockHolidays);
      } catch {
        setSalesRecords(mockSalesRecords);
        setInventoryBatches(mockInventoryBatches);
        setHolidays(mockHolidays);
      }
      setInitialized(true);
    }
    init();
  }, []);

  const addSalesRecords = useCallback((records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const newRecs: SalesRecord[] = records.map(r => ({
      ...r, id: 'sales-' + r.date + '-' + r.storeId + '-' + r.skuId, createdAt: now, updatedAt: now,
    }));
    setSalesRecords(prev => [...prev.filter(r => !newRecs.some(n => n.id === r.id)), ...newRecs]);
  }, []);

  const addInventoryBatch = useCallback((b: Omit<InventoryBatch, 'id'>) => {
    setInventoryBatches(prev => [...prev, { ...b, id: generateId() }]);
  }, []);

  const updateInventoryBatch = useCallback((id: string, u: Partial<InventoryBatch>) => {
    setInventoryBatches(prev => prev.map(b => b.id === id ? { ...b, ...u } : b));
  }, []);

  const saveProductionPlan = useCallback((plan: Omit<ProductionPlan, 'id'>) => {
    const id = 'plan-' + plan.date + '-' + plan.storeId + '-' + plan.skuId;
    setProductionPlans(prev => [...prev.filter(p => p.id !== id), { ...plan, id }]);
  }, []);

  const savePredictionRecords = useCallback((records: Omit<PredictionRecord, 'id'>[]) => {
    const now = new Date().toISOString();
    const newRecs = records.map(r => ({ ...r, id: generateId(), createdAt: now }));
    setPredictionRecords(prev => [...prev, ...newRecs]);
  }, []);

  const toggleSkuActive = useCallback((skuId: string) => {
    setSkus(prev => prev.map(s => s.id === skuId ? { ...s, active: !s.active } : s));
  }, []);

  const addHoliday = useCallback((h: Holiday) => setHolidays(prev => [...prev.filter(x => x.date !== h.date), h]), []);
  const deleteHoliday = useCallback((date: string) => setHolidays(prev => prev.filter(h => h.date !== date)), []);
  const getSkuById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getStoreById = useCallback((id: string) => stores.find(s => s.id === id), [stores]);

  return (
    <DataContext.Provider value={{ skus, stores, salesRecords, inventoryBatches, productionPlans, predictionRecords, holidays, initialized, addSalesRecords, addInventoryBatch, updateInventoryBatch, saveProductionPlan, savePredictionRecords, toggleSkuActive, addHoliday, deleteHoliday, getSkuById, getStoreById }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData must be used within a DataProvider');
  return c;
}
