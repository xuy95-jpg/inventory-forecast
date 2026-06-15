'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr } from '@/lib/helpers';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function DataEntryPage() {
  const { stores, skus, addSalesRecords } = useData();
  const storeId = stores[0]?.id || 'store-001';

  // Batch entries: one row per SKU
  const [rows, setRows] = useState<Record<string, { sales: string; cut: string; whole: string }>>({});
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);

  // Add a row
  const addRow = (skuId: string) => {
    if (!rows[skuId]) setRows(prev => ({ ...prev, [skuId]: { sales: '', cut: '', whole: '' } }));
  };

  const removeRow = (skuId: string) => {
    setRows(prev => { const n = { ...prev }; delete n[skuId]; return n; });
  };

  const updateRow = (skuId: string, field: 'sales' | 'cut' | 'whole', value: string) => {
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
      }));

    if (records.length === 0) return;
    addSalesRecords(records);
    setRows({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const enteredCount = Object.keys(rows).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">数据录入</h1>
          <p className="text-sm text-gray-500 mt-1">批量录入 · 一键保存</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          <button onClick={handleSave} disabled={enteredCount === 0}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Save size={14} /> 保存 ({enteredCount})
          </button>
        </div>
      </div>

      {saved && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">✅ 已保存 {enteredCount} 条记录</div>}

      {/* SKU picker */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-wrap gap-2">
          {skus.filter(s => !rows[s.id]).map(sku => (
            <button key={sku.id} onClick={() => addRow(sku.id)}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1">
              <Plus size={12} /> {sku.name}
            </button>
          ))}
        </div>
      </div>

      {/* Batch table */}
      {enteredCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-24">销量(块)</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-24">已切库存(块)</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-24">整模库存(个)</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rows).map(([skuId, v]) => {
                const sku = skus.find(s => s.id === skuId);
                return (
                  <tr key={skuId} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-700 font-medium">{sku?.name || skuId}</td>
                    <td className="px-2 py-1 text-center">
                      <input type="number" min="0" value={v.sales}
                        onChange={e => updateRow(skuId, 'sales', e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input type="number" min="0" value={v.cut}
                        onChange={e => updateRow(skuId, 'cut', e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input type="number" min="0" value={v.whole}
                        onChange={e => updateRow(skuId, 'whole', e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => removeRow(skuId)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
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
