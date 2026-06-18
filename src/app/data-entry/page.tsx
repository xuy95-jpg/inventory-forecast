'use client';

import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr } from '@/lib/helpers';
import { Save, Settings, Plus, X } from 'lucide-react';

export default function DataEntryPage() {
  const { stores, skus, addSalesRecords, toggleSkuActive, addSku } = useData();
  const storeId = stores[0]?.id || 'store-001';
  const activeSkus = useMemo(() => skus.filter(s => s.active), [skus]);
  const inactiveSkus = useMemo(() => skus.filter(s => !s.active), [skus]);

  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(0); // 保存了多少条
  const [showSkuManager, setShowSkuManager] = useState(false);
  const [newSkuForm, setNewSkuForm] = useState(false);
  const [newSku, setNewSku] = useState({ name: '', category: '6寸巴斯克', shelfLife: 5, unit: '个' });

  // Auto-populate: every active SKU gets a row
  const [rows, setRows] = useState<Record<string, { sales: string; cut: string; whole: string; wastage: string; soldOut: boolean }>>({});

  // When active SKUs change, ensure all have rows
  useEffect(() => {
    setRows(prev => {
      const next = { ...prev };
      activeSkus.forEach(s => {
        if (!next[s.id]) next[s.id] = { sales: '', cut: '', whole: '', wastage: '', soldOut: false };
      });
      return next;
    });
  }, [activeSkus]);

  const updateRow = (skuId: string, field: string, value: string | boolean) => {
    setRows(prev => ({ ...prev, [skuId]: { ...prev[skuId], [field]: value } }));
  };

  const handleSave = () => {
    const records = Object.entries(rows)
      .filter(([, v]) => v.sales !== '' || v.cut !== '' || v.whole !== '' || v.wastage !== '')
      .map(([skuId, v]) => ({
        date, storeId, skuId,
        salesQuantity: parseInt(v.sales) || 0,
        cutStock: parseInt(v.cut) || 0,
        wholeStock: parseInt(v.whole) || 0,
        wastage: parseInt(v.wastage) || 0,
        soldOut: !!v.soldOut,
      }));
    if (records.length === 0) return;
    addSalesRecords(records);
    setSaved(records.length);  // 记住保存了几条
    // Clear values but keep rows
    setRows(prev => { const next: Record<string, { sales: string; cut: string; whole: string; wastage: string; soldOut: boolean }> = {}; Object.keys(prev).forEach(k => { next[k] = { sales: '', cut: '', whole: '', wastage: '', soldOut: false }; }); return next; });
    setTimeout(() => setSaved(0), 2000);
  };

  const filledCount = Object.values(rows).filter(v => v.sales !== '' || v.cut !== '' || v.whole !== '' || v.wastage !== '').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">数据录入</h1>
          <p className="text-sm text-gray-500 mt-1">填入数值即可 · {filledCount} 个品已填</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSkuManager(!showSkuManager)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Settings size={14} /> 品项管理</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          <button onClick={handleSave} disabled={filledCount === 0}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Save size={14} /> 保存 ({filledCount}品)
          </button>
        </div>
      </div>

      {saved > 0 && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">✅ 已保存 {saved} 条记录到数据库</div>}

      {/* 品项管理 */}
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
          {inactiveSkus.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">已下架: {inactiveSkus.map(s => s.name).join(', ')}</div>
          )}

          {/* 新增产品 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            {!newSkuForm ? (
              <button onClick={() => setNewSkuForm(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus size={12} /> 新增产品
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input type="text" placeholder="产品名" value={newSku.name} onChange={e => setNewSku({...newSku, name: e.target.value})}
                  className="px-2 py-1 border border-gray-200 rounded text-xs w-32" />
                <select value={newSku.category} onChange={e => setNewSku({...newSku, category: e.target.value})}
                  className="px-2 py-1 border border-gray-200 rounded text-xs">
                  <option value="6寸巴斯克">6寸巴斯克</option>
                  <option value="罐罐">罐罐</option>
                  <option value="4寸巴斯克">4寸巴斯克</option>
                  <option value="OMAKASE">OMAKASE</option>
                  <option value="其他">其他</option>
                </select>
                <input type="number" min={1} max={10} value={newSku.shelfLife} onChange={e => setNewSku({...newSku, shelfLife: parseInt(e.target.value)||5})}
                  className="px-2 py-1 border border-gray-200 rounded text-xs w-14" placeholder="天数" />
                <select value={newSku.unit} onChange={e => setNewSku({...newSku, unit: e.target.value})}
                  className="px-2 py-1 border border-gray-200 rounded text-xs">
                  <option value="个">个</option>
                  <option value="罐">罐</option>
                  <option value="份">份</option>
                </select>
                <button onClick={() => {
                  if (newSku.name.trim()) { addSku({...newSku, active: true}); setNewSku({name:'',category:'6寸巴斯克',shelfLife:5,unit:'个'}); setNewSkuForm(false); }
                }} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">添加</button>
                <button onClick={() => setNewSkuForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14}/></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 批量表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-24">销量(块)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-24">切角库存(块)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-24">整模库存(个)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-20">报损(块)</th>
              <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 w-14">售罄</th>
            </tr>
          </thead>
          <tbody>
            {activeSkus.map(sku => {
              const v = rows[sku.id] || { sales: '', cut: '', whole: '', wastage: '', soldOut: false };
              const hasValue = v.sales !== '' || v.cut !== '' || v.whole !== '' || v.wastage !== '';
              return (
                <tr key={sku.id} className={`border-b border-gray-50 ${hasValue ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-700 font-medium">{sku.name}</td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={v.sales} onChange={e => updateRow(sku.id, 'sales', e.target.value)} placeholder=""
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={v.cut} onChange={e => updateRow(sku.id, 'cut', e.target.value)} placeholder=""
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={v.whole} onChange={e => updateRow(sku.id, 'whole', e.target.value)} placeholder=""
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded text-sm text-center focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="number" min="0" value={v.wastage} onChange={e => updateRow(sku.id, 'wastage', e.target.value)} placeholder=""
                      className="w-16 px-1.5 py-1.5 border border-red-200 rounded text-sm text-center text-red-500 focus:ring-2 focus:ring-red-500" />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input type="checkbox" checked={v.soldOut} onChange={e => updateRow(sku.id, 'soldOut', e.target.checked)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
