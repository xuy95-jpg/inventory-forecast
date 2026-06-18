'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr } from '@/lib/helpers';
import { Save, Plus, Trash2, Settings } from 'lucide-react';

export default function DataEntryPage() {
  const { stores, skus, addSalesRecords, toggleSkuActive } = useData();
  const storeId = stores[0]?.id || 'store-001';
  const [rows, setRows] = useState<Record<string, { sales: string; cut: string; whole: string; wastage: string; soldOut: boolean }>>({});
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);
  const [showSkuManager, setShowSkuManager] = useState(false);

  const addRow = (skuId: string) => {
    if (!rows[skuId]) setRows(prev => ({ ...prev, [skuId]: { sales: '', cut: '', whole: '', wastage: '', soldOut: false } }));
  };
  const removeRow = (skuId: string) => {
    setRows(prev => { const n = { ...prev }; delete n[skuId]; return n; });
  };
  const updateRow = (skuId: string, field: string, value: string | boolean) => {
    setRows(prev => ({ ...prev, [skuId]: { ...prev[skuId], [field]: value } }));
  };

  const handleSave = () => {
    const records = Object.entries(rows)
      .filter(([, v]) => v.sales !== '' || v.cut !== '' || v.whole !== '')
      .map(([skuId, v]) => ({
        date, storeId, skuId,
        salesQuantity: parseInt(v.sales) || 0,
        cutStock: parseInt(v.cut) || 0,
        wholeStock: parseInt(v.whole) || 0,
        wastage: parseInt(v.wastage) || 0,
        soldOut: v.soldOut,
      }));
    if (records.length === 0) return;
    addSalesRecords(records);
    setRows({}); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const enteredCount = Object.keys(rows).length;
  const activeSkus = skus.filter(s => s.active);
  const inactiveSkus = skus.filter(s => !s.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">数据录入</h1>
          <p className="text-sm text-gray-500 mt-1">批量录入 · 含报损/售罄 · 一键保存</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSkuManager(!showSkuManager)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Settings size={14} /> 品项管理</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          <button onClick={handleSave} disabled={enteredCount === 0} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"><Save size={14} /> 保存 ({enteredCount})</button>
        </div>
      </div>

      {saved && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">✅ 已保存 {enteredCount} 条记录</div>}

      {/* 品项管理面板 */}
      {showSkuManager && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">品项管理（勾选在售，取消=下架）</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {skus.map(sku => (
              <label key={sku.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                <input type="checkbox" checked={sku.active} onChange={() => toggleSkuActive(sku.id)} className="rounded" />
                <span className={sku.active ? 'text-gray-800' : 'text-gray-400 line-through'}>{sku.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* SKU picker (only active) */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="text-xs text-gray-400 mb-2">点击添加在售SKU：</div>
        <div className="flex flex-wrap gap-2">
          {activeSkus.filter(s => !rows[s.id]).map(sku => (
            <button key={sku.id} onClick={() => addRow(sku.id)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1"><Plus size={12} /> {sku.name}</button>
          ))}
        </div>
        {inactiveSkus.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-300 mb-2">已下架（品项管理可上架）：</div>
            <div className="flex flex-wrap gap-1">
              {inactiveSkus.map(sku => (
                <span key={sku.id} className="px-2 py-1 text-xs bg-gray-50 text-gray-300 rounded line-through">{sku.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Batch entry table */}
      {enteredCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-20">销量(块)</th>
                <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-20">切角库存</th>
                <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-20">整模库存</th>
                <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-20">报损</th>
                <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-16">售罄</th>
                <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rows).map(([skuId, v]) => {
                const sku = skus.find(s => s.id === skuId);
                return (
                  <tr key={skuId} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-700 font-medium">{sku?.name || skuId}</td>
                    <td className="px-1 py-1 text-center"><input type="number" min="0" value={v.sales} onChange={e => updateRow(skuId, 'sales', e.target.value)} placeholder="0" className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center" /></td>
                    <td className="px-1 py-1 text-center"><input type="number" min="0" value={v.cut} onChange={e => updateRow(skuId, 'cut', e.target.value)} placeholder="0" className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center" /></td>
                    <td className="px-1 py-1 text-center"><input type="number" min="0" value={v.whole} onChange={e => updateRow(skuId, 'whole', e.target.value)} placeholder="0" className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center" /></td>
                    <td className="px-1 py-1 text-center"><input type="number" min="0" value={v.wastage} onChange={e => updateRow(skuId, 'wastage', e.target.value)} placeholder="0" className="w-16 px-1.5 py-1.5 border border-red-200 rounded text-sm text-center text-red-500" /></td>
                    <td className="px-1 py-1 text-center"><input type="checkbox" checked={v.soldOut} onChange={e => updateRow(skuId, 'soldOut', e.target.checked)} /></td>
                    <td className="px-1 py-1 text-center"><button onClick={() => removeRow(skuId)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
