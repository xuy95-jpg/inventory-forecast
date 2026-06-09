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

// ============================================================
// localStorage keys
// ============================================================
const STORAGE_KEYS = {
  salesRecords: 'forecast_v2_sales_records',
  inventoryBatches: 'forecast_v2_inventory_batches',
  productionPlans: 'forecast_v2_production_plans',
  holidays: 'forecast_v2_holidays',
};

// ============================================================
// Context type
// ============================================================
interface DataContextType {
  // Master data (read-only)
  skus: Sku[];
  stores: Store[];

  // Dynamic data
  salesRecords: SalesRecord[];
  inventoryBatches: InventoryBatch[];
  productionPlans: ProductionPlan[];
  holidays: Holiday[];

  // Sales records CRUD
  addSalesRecord: (record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSalesRecord: (id: string, updates: Partial<SalesRecord>) => void;
  deleteSalesRecord: (id: string) => void;
  importSalesRecords: (records: SalesRecord[]) => void;

  // Inventory
  addInventoryBatch: (batch: Omit<InventoryBatch, 'id'>) => void;
  updateInventoryBatch: (id: string, updates: Partial<InventoryBatch>) => void;

  // Production plans
  addProductionPlan: (plan: Omit<ProductionPlan, 'id'>) => void;
  updateProductionPlan: (id: string, updates: Partial<ProductionPlan>) => void;
  confirmProductionPlan: (id: string, actualQuantity: number, notes: string) => void;
  deleteProductionPlan: (id: string) => void;

  // Holidays
  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (date: string) => void;

  // Helpers
  getSkuById: (id: string) => Sku | undefined;
  getStoreById: (id: string) => Store | undefined;
  getStoreByCode: (code: string) => Store | undefined;
  getSkuByName: (name: string) => Sku | undefined;
}

const DataContext = createContext<DataContextType | null>(null);

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
  // Initialize from localStorage (fallback to mock data)
  // ============================================================
  useEffect(() => {
    if (initialized) return;

    // Sales records
    const storedSales = localStorage.getItem(STORAGE_KEYS.salesRecords);
    setSalesRecords(storedSales ? JSON.parse(storedSales) : mockSalesRecords);

    // Inventory batches
    const storedInventory = localStorage.getItem(STORAGE_KEYS.inventoryBatches);
    setInventoryBatches(storedInventory ? JSON.parse(storedInventory) : mockInventoryBatches);

    // Production plans
    const storedPlans = localStorage.getItem(STORAGE_KEYS.productionPlans);
    setProductionPlans(storedPlans ? JSON.parse(storedPlans) : []);

    // Holidays
    const storedHolidays = localStorage.getItem(STORAGE_KEYS.holidays);
    setHolidays(storedHolidays ? JSON.parse(storedHolidays) : mockHolidays);

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Persist to localStorage on every change
  // ============================================================
  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEYS.salesRecords, JSON.stringify(salesRecords));
  }, [salesRecords, initialized]);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEYS.inventoryBatches, JSON.stringify(inventoryBatches));
  }, [inventoryBatches, initialized]);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEYS.productionPlans, JSON.stringify(productionPlans));
  }, [productionPlans, initialized]);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEYS.holidays, JSON.stringify(holidays));
  }, [holidays, initialized]);

  // ============================================================
  // Sales Records CRUD
  // ============================================================
  const addSalesRecord = useCallback((record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existingId = `sales-${record.date}-${record.storeId}-${record.skuId}`;

    setSalesRecords(prev => {
      // Replace if same date+store+sku
      const filtered = prev.filter(r => r.id !== existingId);
      return [...filtered, {
        ...record,
        id: existingId,
        createdAt: prev.find(r => r.id === existingId)?.createdAt || now,
        updatedAt: now,
      }];
    });
  }, []);

  const updateSalesRecord = useCallback((id: string, updates: Partial<SalesRecord>) => {
    setSalesRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
  }, []);

  const deleteSalesRecord = useCallback((id: string) => {
    setSalesRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const importSalesRecords = useCallback((records: SalesRecord[]) => {
    setSalesRecords(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const newRecords = records.filter(r => !existingIds.has(r.id));
      return [...prev, ...newRecords];
    });
  }, []);

  // ============================================================
  // Inventory
  // ============================================================
  const addInventoryBatch = useCallback((batch: Omit<InventoryBatch, 'id'>) => {
    const newBatch: InventoryBatch = {
      ...batch,
      id: generateId(),
    };
    setInventoryBatches(prev => [...prev, newBatch]);
  }, []);

  const updateInventoryBatch = useCallback((id: string, updates: Partial<InventoryBatch>) => {
    setInventoryBatches(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updates } : b))
    );
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
  }, []);

  const updateProductionPlan = useCallback((id: string, updates: Partial<ProductionPlan>) => {
    setProductionPlans(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const confirmProductionPlan = useCallback((
    id: string,
    actualQuantity: number,
    notes: string
  ) => {
    setProductionPlans(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              actualQuantity,
              notes,
              confirmedAt: new Date().toISOString(),
            }
          : p
      )
    );
  }, []);

  const deleteProductionPlan = useCallback((id: string) => {
    setProductionPlans(prev => prev.filter(p => p.id !== id));
  }, []);

  // ============================================================
  // Holidays
  // ============================================================
  const addHoliday = useCallback((holiday: Holiday) => {
    setHolidays(prev => {
      const filtered = prev.filter(h => h.date !== holiday.date);
      return [...filtered, holiday];
    });
  }, []);

  const deleteHoliday = useCallback((date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
  }, []);

  // ============================================================
  // Helpers
  // ============================================================
  const getSkuById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getStoreById = useCallback((id: string) => stores.find(s => s.id === id), [stores]);
  const getStoreByCode = useCallback((code: string) => stores.find(s => s.code === code), [stores]);
  const getSkuByName = useCallback((name: string) => skus.find(s => s.name === name), [skus]);

  const value: DataContextType = {
    skus,
    stores,
    salesRecords,
    inventoryBatches,
    productionPlans,
    holidays,
    addSalesRecord,
    updateSalesRecord,
    deleteSalesRecord,
    importSalesRecords,
    addInventoryBatch,
    updateInventoryBatch,
    addProductionPlan,
    updateProductionPlan,
    confirmProductionPlan,
    deleteProductionPlan,
    addHoliday,
    deleteHoliday,
    getSkuById,
    getStoreById,
    getStoreByCode,
    getSkuByName,
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
