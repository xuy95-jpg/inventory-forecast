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
  addSku: (sku: Omit<Sku, 'id'>) => void;
  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (date: string) => void;
  getSkuById: (id: string) => Sku | undefined;
  getStoreById: (id: string) => Store | undefined;
}

const DataContext = createContext<DataContextType | null>(null);

function mapSales(r: Record<string, unknown>): SalesRecord {
  return {
    id: r.id as string, date: r.date as string, storeId: r.store_id as string, skuId: r.sku_id as string,
    salesQuantity: r.sales_quantity as number,
    cutStock: (r as Record<string,unknown>).cut_stock as number || 0,
    wholeStock: (r as Record<string,unknown>).whole_stock as number || 0,
    wastage: (r as Record<string,unknown>).wastage as number || 0,
    soldOut: (r as Record<string,unknown>).sold_out as boolean || false,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

function mapInv(r: Record<string, unknown>): InventoryBatch {
  return {
    id: r.id as string, skuId: r.sku_id as string, storeId: r.store_id as string,
    productionDate: r.production_date as string, quantity: r.quantity as number,
    remainingQuantity: r.remaining_quantity as number, shelfLife: r.shelf_life as number,
    expiryDate: r.expiry_date as string, batchType: ((r as Record<string,unknown>).batch_type as string || 'whole') as 'whole' | 'cut',
  };
}

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
    (async () => {
      try {
        // Always load from Supabase first. Only seed if truly empty.
        // Use pagination to get ALL records (Supabase defaults to 1000 limit)
        let allSales: Record<string, unknown>[] = [];
        let page = 0;
        const PAGE_SIZE = 1000;
        while (true) {
          const { data: s } = await supabase.from('sales_records').select('*').order('date', { ascending: true }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (!s || s.length === 0) break;
          allSales = [...allSales, ...(s as Record<string, unknown>[])];
          if (s.length < PAGE_SIZE) break;
          page++;
        }
        const isEmpty = allSales.length === 0;

        // Also check inventory batches separately (may be empty even if sales exist)
        const { data: invCheck } = await supabase.from('inventory_batches').select('id').limit(1);
        const invEmpty = !invCheck || invCheck.length === 0;

        if (isEmpty || invEmpty) {
          for (let i = 0; i < mockSalesRecords.length; i += 500) {
            await supabase.from('sales_records').upsert(mockSalesRecords.slice(i, i + 500).map(r => ({
              id: r.id, date: r.date, store_id: r.storeId, sku_id: r.skuId,
              sales_quantity: r.salesQuantity, cut_stock: r.cutStock, whole_stock: r.wholeStock,
              wastage: r.wastage, sold_out: r.soldOut, created_at: r.createdAt, updated_at: r.updatedAt,
            })));
          }
          await supabase.from('inventory_batches').upsert(mockInventoryBatches.map(b => ({
            id: b.id, sku_id: b.skuId, store_id: b.storeId, production_date: b.productionDate,
            quantity: b.quantity, remaining_quantity: b.remainingQuantity, shelf_life: b.shelfLife,
            expiry_date: b.expiryDate, batch_type: b.batchType,
          })));
          await supabase.from('holidays').upsert(mockHolidays.map(h => ({ date: h.date, name: h.name, is_holiday: h.isHoliday })));
          await supabase.from('stores').upsert(mockStores.map(s => ({ id: s.id, name: s.name, code: s.code, region: s.region })));
          setSalesRecords(mockSalesRecords);
          setInventoryBatches(mockInventoryBatches);
        } else {
          setSalesRecords(allSales.map(mapSales));
          const { data: inv } = await supabase.from('inventory_batches').select('*');
          setInventoryBatches(inv?.length ? (inv as Record<string,unknown>[]).map(mapInv) : mockInventoryBatches);
        }
        setHolidays(mockHolidays);
      } catch (err) {
        console.error('Supabase init failed:', err);
        setSalesRecords(mockSalesRecords);
        setInventoryBatches(mockInventoryBatches);
        setHolidays(mockHolidays);
      }
      setInitialized(true);
    })();
  }, []);

  const addSalesRecords = useCallback((records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const newRecs: SalesRecord[] = records.map(r => ({
      ...r, id: 'sales-' + r.date + '-' + r.storeId + '-' + r.skuId, createdAt: now, updatedAt: now,
    }));
    setSalesRecords(prev => [...prev.filter(r => !newRecs.some(n => n.id === r.id)), ...newRecs]);

    // Sync sales to Supabase
    for (let i = 0; i < newRecs.length; i += 100) {
      supabase.from('sales_records').upsert(newRecs.slice(i, i + 100).map(r => ({
        id: r.id, date: r.date, store_id: r.storeId, sku_id: r.skuId,
        sales_quantity: r.salesQuantity, cut_stock: r.cutStock, whole_stock: r.wholeStock,
        wastage: r.wastage, sold_out: r.soldOut, created_at: r.createdAt, updated_at: r.updatedAt,
      }))).then();
    }

    // FIFO 库存扣减：按销量消耗最老的批次
    // 录入的盘点库存用作校验，不直接覆盖
    newRecs.forEach((r) => {
      const salesQuantity = r.salesQuantity;
      if (salesQuantity <= 0) return;

      // Read current batches for this SKU, sorted by expiry (FIFO)
      supabase.from('inventory_batches')
        .select('*')
        .eq('store_id', r.storeId)
        .eq('sku_id', r.skuId)
        .order('expiry_date', { ascending: true })
        .then(({ data: batches }) => {
          if (!batches?.length) return;

          let remaining = salesQuantity;
          const updates: { id: string; remaining: number }[] = [];

          for (const b of batches) {
            if (remaining <= 0) break;
            const deduct = Math.min(b.remaining_quantity, remaining);
            updates.push({ id: b.id, remaining: Math.max(0, b.remaining_quantity - deduct) });
            remaining -= deduct;
          }

          // Apply updates
          updates.forEach(u => {
            supabase.from('inventory_batches').update({ remaining_quantity: u.remaining }).eq('id', u.id).then();
          });

          // Also update local state
          setInventoryBatches(prev => prev.map(b => {
            const up = updates.find(u => u.id === b.id);
            return up ? { ...b, remainingQuantity: up.remaining } : b;
          }));

          // ---- 当天过期移除 ----
          // 扣减完后，把当天到期的批次也清掉（过期不可售）
          supabase.from('inventory_batches')
            .select('id').eq('store_id', r.storeId).eq('sku_id', r.skuId)
            .lte('expiry_date', r.date).then(({ data: expData }) => {
              if (expData?.length) {
                const ids = expData.map(e => e.id);
                supabase.from('inventory_batches').delete().in('id', ids).then();
                setInventoryBatches(prev => prev.filter(b => !ids.includes(b.id)));
              }
            });

          // ---- 校验 ----
          let computedCut = 0, computedWhole = 0;
          batches.forEach(b => {
            const up = updates.find(u => u.id === b.id);
            const newRemaining = up ? up.remaining : b.remaining_quantity;
            if (b.batch_type === 'cut') computedCut += newRemaining;
            else computedWhole += newRemaining;
          });
          const enteredTotal = (r.cutStock || 0) + (r.wholeStock || 0) * 6;
          const computedTotal = computedCut + computedWhole * 6;

          if (Math.abs(enteredTotal - computedTotal) > 2 && enteredTotal > 0) {
            console.warn(
              '⚠️ 库存校验差异: ' + r.skuId + ' 录入=' + enteredTotal + '块(切' + r.cutStock + '整' + r.wholeStock + ') ' +
              '计算=' + computedTotal + '块(切' + computedCut + '整' + computedWhole + ') ' +
              '差=' + (enteredTotal - computedTotal) + '块'
            );
          }
        });
    });
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
    supabase.from('production_plans').upsert({ id, date: plan.date, store_id: plan.storeId, sku_id: plan.skuId, suggested_quantity: plan.suggestedQuantity, actual_quantity: plan.actualQuantity, confirmed_at: plan.confirmedAt, notes: plan.notes }).then();
  }, []);

  const savePredictionRecords = useCallback((records: Omit<PredictionRecord, 'id'>[]) => {
    const now = new Date().toISOString();
    const newRecs = records.map(r => ({ ...r, id: generateId(), createdAt: now }));
    setPredictionRecords(prev => [...prev, ...newRecs]);
  }, []);

  const toggleSkuActive = useCallback((skuId: string) => {
    setSkus(prev => prev.map(s => s.id === skuId ? { ...s, active: !s.active } : s));
  }, []);

  const addSku = useCallback((sku: Omit<Sku, 'id'>) => {
    const id = 'sku-custom-' + Date.now();
    setSkus(prev => [...prev, { ...sku, id }]);
  }, []);

  const addHoliday = useCallback((h: Holiday) => setHolidays(prev => [...prev.filter(x => x.date !== h.date), h]), []);
  const deleteHoliday = useCallback((date: string) => setHolidays(prev => prev.filter(h => h.date !== date)), []);
  const getSkuById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getStoreById = useCallback((id: string) => stores.find(s => s.id === id), [stores]);

  return (
    <DataContext.Provider value={{ skus, stores, salesRecords, inventoryBatches, productionPlans, predictionRecords, holidays, initialized, addSalesRecords, addInventoryBatch, updateInventoryBatch, saveProductionPlan, savePredictionRecords, toggleSkuActive, addSku, addHoliday, deleteHoliday, getSkuById, getStoreById }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData must be used within a DataProvider');
  return c;
}
