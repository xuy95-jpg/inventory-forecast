'use client';

import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr } from '@/lib/helpers';
import { Save, Settings, Plus, X, Trash2, Download, ChevronDown, Package } from 'lucide-react';

interface BatchRow {
  key: string;         // unique key for React
  skuId: string;
  cut: string;
  whole: string;
  prodDate: string;
}

export default function DataEntryPage() {
  const { stores, skus, salesRecords, addSalesRecords, inventoryBatches, addInventoryBatch, toggleSkuActive, addSku } = useData();
  const storeId = stores[0]?.id || 'store-001';
  const activeSkus = useMemo(() => skus.filter(s => s.active), [skus]);
  const inactiveSkus = useMemo(() => skus.filter(s => !s.active), [skus]);

  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(0);
  const [showSkuManager, setShowSkuManager] = useState(false);
  const [newSkuForm, setNewSkuForm] = useState(false);
  const [newSku, setNewSku] = useState({ name: '', category: '6寸巴斯克', shelfLife: 4, unit: '个' });

  // Export
  const [showExport, setShowExport] = useState(false);
  const [exportStart, setExportStart] = useState(todayStr());
  const [exportEnd, setExportEnd] = useState(todayStr());

  // === Sales rows (one per SKU) ===
  const [salesRows, setSalesRows] = useState<Record<string, { sales: string; wastage: string; soldOut: boolean }>>({});

  // === Inventory batch rows (multiple per SKU) ===
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);

  // Initialize sales rows for all active SKUs
  useEffect(() => {
    setSalesRows(prev => {
      const next = { ...prev };
      activeSkus.forEach(s => {
        if (!next[s.id]) next[s.id] = { sales: '', wastage: '', soldOut: false };
      });
      return next;
    });
  }, [activeSkus]);

  // Pre-fill from existing data for the selected date
  useEffect(() => {
    const existing = salesRecords.filter(r => r.date === date && r.storeId === storeId);

    // Fill sales rows
    setSalesRows(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { sales: '', wastage: '', soldOut: false }; });
      existing.forEach(r => {
        if (next[r.skuId]) {
          next[r.skuId] = {
            sales: r.salesQuantity > 0 ? String(r.salesQuantity) : '',
            wastage: r.wastage > 0 ? String(r.wastage) : '',
            soldOut: r.soldOut,
          };
        }
      });
      return next;
    });

    // Fill batch rows from existing inventory_batches for this date
    const dayBatches = inventoryBatches.filter(b => b.productionDate === date && b.storeId === storeId);
    if (dayBatches.length > 0) {
      setBatchRows(dayBatches.map((b, i) => ({
        key: 'existing-' + b.id,
        skuId: b.skuId,
        cut: b.batchType === 'cut' ? String(b.remainingQuantity) : '',
        whole: b.batchType === 'whole' ? String(b.remainingQuantity) : '',
        prodDate: b.productionDate,
      })));
    } else {
      setBatchRows([]);
    }
  }, [date, salesRecords, inventoryBatches, storeId]);

  const updateSales = (skuId: string, field: string, value: string | boolean) => {
    setSalesRows(prev => ({ ...prev, [skuId]: { ...prev[skuId], [field]: value } }));
  };

  const updateBatch = (key: string, field: string, value: string) => {
    setBatchRows(prev => prev.map(b => b.key === key ? { ...b, [field]: value } : b));
  };

  const addBatchRow = () => {
    const k = 'new-' + Date.now() + '-' + batchRows.length;
    setBatchRows(prev => [...prev, { key: k, skuId: activeSkus[0]?.id || '', cut: '', whole: '', prodDate: date }]);
  };

  const removeBatch = (key: string) => {
    setBatchRows(prev => prev.filter(b => b.key !== key));
  };

  const handleSave = () => {
    // 1. Save sales records
    const salesRecords2 = Object.entries(salesRows)
      .filter(([, v]) => v.sales !== '' || v.wastage !== '')
      .map(([skuId, v]) => ({
        date, storeId, skuId,
        salesQuantity: parseInt(v.sales) || 0,
        cutStock: 0, wholeStock: 0,  // will compute from batches below
        wastage: parseInt(v.wastage) || 0,
        soldOut: !!v.soldOut,
      }));

    // 2. Save inventory batches
    const batches = batchRows
      .filter(b => b.cut !== '' || b.whole !== '')
      .map(b => {
        const sku = skus.find(s => s.id === b.skuId);
        const sl = sku?.shelfLife || 4;
        const expiry = new Date(b.prodDate); expiry.setDate(expiry.getDate() + sl);
        return {
          id: 'batch-' + b.skuId + '-' + b.prodDate + '-' + (b.cut !== '' ? 'cut' : 'whole') + '-' + b.key,
          skuId: b.skuId, storeId, productionDate: b.prodDate,
          cutStock: parseInt(b.cut) || 0,
          wholeStock: parseInt(b.whole) || 0,
          shelfLife: sl, expiryDate: expiry.toISOString().split('T')[0],
        };
      });

    // Compute aggregate stock per SKU for sales record
    const stockBySku: Record<string, { cut: number; whole: number }> = {};
    batches.forEach(b => {
      if (!stockBySku[b.skuId]) stockBySku[b.skuId] = { cut: 0, whole: 0 };
      stockBySku[b.skuId].cut += b.cutStock;
      stockBySku[b.skuId].whole += b.wholeStock;
    });

    // Final sales records with aggregated stock
    const finalSalesRecords = salesRecords2.map(r => ({
      ...r,
      cutStock: stockBySku[r.skuId]?.cut || 0,
      wholeStock: stockBySku[r.skuId]?.whole || 0,
    }));

    if (finalSalesRecords.length === 0 && batches.length === 0) return;

    const totalItems = finalSalesRecords.length + batches.length;

    // Save
    if (finalSalesRecords.length > 0) addSalesRecords(finalSalesRecords);
    batches.forEach(b => {
      addInventoryBatch({
        skuId: b.skuId, storeId,
        productionDate: b.productionDate,
        quantity: (b.cutStock || 0) + (b.wholeStock || 0),
        remainingQuantity: (b.cutStock || 0) + (b.wholeStock || 0),
        shelfLife: b.shelfLife, expiryDate: b.expiryDate,
        batchType: b.wholeStock > 0 ? 'whole' : 'cut',
      });
    });

    setSaved(totalItems);
    setTimeout(() => setSaved(0), 2000);
  };

  const handleDelete = () => {
    const hasSales = Object.values(salesRows).some(v => v.sales !== '' || v.wastage !== '');
    if (!hasSales && batchRows.length === 0) return;
    if (!confirm(`确认删除 ${date} 的全部数据？`)) return;

    if (hasSales) {
      addSalesRecords(
        Object.keys(salesRows).filter(k => salesRows[k].sales !== '' || salesRows[k].wastage !== '')
          .map(skuId => ({ date, storeId, skuId, salesQuantity: 0, cutStock: 0, wholeStock: 0, wastage: 0, soldOut: false }))
      );
    }
    setSalesRows(prev => { const n = { ...prev }; Object.keys(n).forEach(k => { n[k] = { sales: '', wastage: '', soldOut: false }; }); return n; });
    setBatchRows([]);
    setSaved(-1);
    setTimeout(() => setSaved(0), 2000);
  };

  const handleExport = () => {
    const records = salesRecords.filter(r => r.date >= exportStart && r.date <= exportEnd && r.storeId === storeId);
    if (records.length === 0) { alert('所选日期范围无数据'); return; }
    const map: Record<string, { name: string; sales: number; cut: number; whole: number; wastage: number; soldOut: boolean }> = {};
    records.forEach(r => {
      if (!map[r.skuId]) { const sku = skus.find(s => s.id === r.skuId); map[r.skuId] = { name: sku?.name || r.skuId, sales: 0, cut: 0, whole: 0, wastage: 0, soldOut: false }; }
      map[r.skuId].sales += r.salesQuantity; map[r.skuId].cut = r.cutStock; map[r.skuId].whole = r.wholeStock;
      map[r.skuId].wastage += r.wastage; if (r.soldOut) map[r.skuId].soldOut = true;
    });
    const data = Object.values(map).filter(d => d.sales > 0 || d.cut > 0 || d.whole > 0);
    let csv = 'SKU,累计销量(块),盘点切角,盘点整模,累计报损,售罄\n';
    data.forEach(d => { csv += d.name + ',' + d.sales + ',' + d.cut + ',' + d.whole + ',' + d.wastage + ',' + (d.soldOut?'是':'否') + '\n'; });
    csv += '合计,' + data.reduce((s,d)=>s+d.sales,0) + '\n时间范围,' + exportStart + '~' + exportEnd;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nana-' + exportStart + '.csv'; a.click();
    URL.revokeObjectURL(url); setShowExport(false);
  };

  const filledSales = Object.values(salesRows).filter(v => v.sales !== '' || v.wastage !== '').length;
  const filledBatches = batchRows.filter(b => b.cut !== '' || b.whole !== '').length;
  const totalFilled = filledSales + filledBatches;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">数据录入</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalFilled > 0
              ? `📝 ${date} 销量${filledSales}品 + 库存${filledBatches}批`
              : '填入销量和库存批次'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSkuManager(!showSkuManager)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Settings size={14} /> 品项管理</button>

          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Download size={14} /> 导出 <ChevronDown size={10} /></button>
            {showExport && (
              <div className="absolute right-0 top-10 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
                <div className="text-xs font-medium text-gray-500 mb-2">选择导出日期范围</div>
                <div className="flex items-center gap-2 mb-2">
                  <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs" />
                  <span className="text-xs text-gray-400">至</span>
                  <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs" />
                </div>
                <button onClick={handleExport} className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">确认导出</button>
                <button onClick={() => setShowExport(false)} className="w-full px-3 py-1.5 text-xs text-gray-400 mt-1 hover:text-gray-600">取消</button>
              </div>
            )}
          </div>

          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          {totalFilled > 0 && (
            <button onClick={handleDelete} className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"><Trash2 size={14} /> 删除</button>
          )}
          <button onClick={handleSave} disabled={totalFilled === 0}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Save size={14} /> 保存
          </button>
        </div>
      </div>

      {saved > 0 && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">✅ 已保存（{filledSales}品销量 + {filledBatches}批库存）</div>}
      {saved < 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">🗑️ 已删除当日数据</div>}

      {showSkuManager && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">品项管理（勾选在售）</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {skus.map(sku => (
              <label key={sku.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                <input type="checkbox" checked={sku.active} onChange={() => toggleSkuActive(sku.id)} className="rounded" />
                <span className={sku.active ? 'text-gray-800' : 'text-gray-400 line-through'}>{sku.name}</span>
              </label>
            ))}
          </div>
          {inactiveSkus.length > 0 && <div className="mt-2 text-xs text-gray-400">已下架: {inactiveSkus.map(s => s.name).join(', ')}</div>}
          <div className="mt-3 pt-3 border-t border-gray-100">
            {!newSkuForm ? (
              <button onClick={() => setNewSkuForm(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><Plus size={12} /> 新增产品</button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="text" placeholder="产品名" value={newSku.name} onChange={e => setNewSku({...newSku, name: e.target.value})} className="px-2 py-1 border border-gray-200 rounded text-xs w-32" />
                <select value={newSku.category} onChange={e => setNewSku({...newSku, category: e.target.value})} className="px-2 py-1 border border-gray-200 rounded text-xs">
                  <option value="6寸巴斯克">6寸巴斯克</option><option value="罐罐">罐罐</option><option value="4寸巴斯克">4寸巴斯克</option><option value="OMAKASE">OMAKASE</option><option value="其他">其他</option>
                </select>
                <input type="number" min={1} max={10} value={newSku.shelfLife} onChange={e => setNewSku({...newSku, shelfLife: parseInt(e.target.value)||4})} className="px-2 py-1 border border-gray-200 rounded text-xs w-14" />
                <select value={newSku.unit} onChange={e => setNewSku({...newSku, unit: e.target.value})} className="px-2 py-1 border border-gray-200 rounded text-xs">
                  <option value="个">个</option><option value="罐">罐</option><option value="份">份</option>
                </select>
                <button onClick={() => { if (newSku.name.trim()) { addSku({...newSku, active: true}); setNewSku({name:'',category:'6寸巴斯克',shelfLife:4,unit:'个'}); setNewSkuForm(false); } }} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">添加</button>
                <button onClick={() => setNewSkuForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14}/></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Section 1: 每日销量 === */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">📊 每日销量</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-24">销量(块)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-20">报损(块)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-14">售罄</th>
            </tr>
          </thead>
          <tbody>
            {activeSkus.map(sku => {
              const v = salesRows[sku.id] || { sales: '', wastage: '', soldOut: false };
              const filled = v.sales !== '' || v.wastage !== '';
              return (
                <tr key={sku.id} className={`border-b border-gray-50 ${filled ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-700 font-medium">{sku.name}</td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={v.sales} onChange={e => updateSales(sku.id, 'sales', e.target.value)}
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={v.wastage} onChange={e => updateSales(sku.id, 'wastage', e.target.value)}
                      className="w-14 px-1.5 py-1.5 border border-red-200 rounded text-sm text-center text-red-500 focus:ring-2 focus:ring-red-500" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="checkbox" checked={v.soldOut} onChange={e => updateSales(sku.id, 'soldOut', e.target.checked)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* === Section 2: 库存批次 === */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-2"><Package size={12} /> 库存批次 · 生产日期</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-32">SKU</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-24">切角(块)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-24">整模(个)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-32">生产日期</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {batchRows.map(b => {
              const sku = skus.find(s => s.id === b.skuId);
              return (
                <tr key={b.key} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-1 py-1">
                    <select value={b.skuId} onChange={e => updateBatch(b.key, 'skuId', e.target.value)}
                      className="w-full px-1 py-1.5 border border-gray-200 rounded text-xs">
                      {activeSkus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={b.cut} onChange={e => updateBatch(b.key, 'cut', e.target.value)}
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={b.whole} onChange={e => updateBatch(b.key, 'whole', e.target.value)}
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="date" value={b.prodDate} onChange={e => updateBatch(b.key, 'prodDate', e.target.value)}
                      className="px-1 py-1.5 border border-gray-200 rounded text-xs" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button onClick={() => removeBatch(b.key)} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-gray-100">
          <button onClick={addBatchRow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
            <Plus size={12} /> 新增批次
          </button>
        </div>
      </div>
    </div>
  );
}
