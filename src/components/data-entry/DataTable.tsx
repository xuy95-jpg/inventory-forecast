'use client';

import { useState } from 'react';
import { SalesRecord } from '@/types';
import { useData } from '@/context/DataContext';
import { formatDisplayDate, getDayOfWeek } from '@/lib/helpers';
import { Pencil, Trash2, Check, X } from 'lucide-react';

export default function DataTable() {
  const { salesRecords, stores, skus, updateSalesRecord, deleteSalesRecord } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ salesQuantity: 0, stockQuantity: 0, actualProduction: 0 });
  const [filterDate, setFilterDate] = useState('');
  const [filterStore, setFilterStore] = useState('');

  // Filter
  let filtered = [...salesRecords];
  if (filterDate) {
    filtered = filtered.filter(r => r.date === filterDate);
  }
  if (filterStore) {
    filtered = filtered.filter(r => r.storeId === filterStore);
  }

  // Sort by date desc
  filtered.sort((a, b) => b.date.localeCompare(a.date) || a.storeId.localeCompare(b.storeId));

  const startEdit = (record: SalesRecord) => {
    setEditingId(record.id);
    setEditValues({
      salesQuantity: record.salesQuantity,
      stockQuantity: record.stockQuantity,
      actualProduction: record.actualProduction ?? 0,
    });
  };

  const saveEdit = (id: string) => {
    updateSalesRecord(id, {
      salesQuantity: editValues.salesQuantity,
      stockQuantity: editValues.stockQuantity,
      actualProduction: editValues.actualProduction || null,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || id;
  const getSkuName = (id: string) => skus.find(s => s.id === id)?.name || id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-800">📋 历史数据</h3>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-xs"
            placeholder="按日期"
          />
          <select
            value={filterStore}
            onChange={e => setFilterStore(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-xs"
          >
            <option value="">全部门店</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">
            {filtered.length} / {salesRecords.length} 条
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">日期</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">星期</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">门店</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">销量</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">库存</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">生产量</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map(record => (
              <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2 text-gray-700">{record.date}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{getDayOfWeek(record.date)}</td>
                <td className="px-4 py-2 text-gray-700">{getStoreName(record.storeId)}</td>
                <td className="px-4 py-2 text-gray-700">{getSkuName(record.skuId)}</td>

                {editingId === record.id ? (
                  <>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={editValues.salesQuantity}
                        onChange={e => setEditValues(prev => ({ ...prev, salesQuantity: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={editValues.stockQuantity}
                        onChange={e => setEditValues(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={editValues.actualProduction}
                        onChange={e => setEditValues(prev => ({ ...prev, actualProduction: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => saveEdit(record.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-right text-gray-900 font-medium">{record.salesQuantity}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{record.stockQuantity}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{record.actualProduction ?? '-'}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(record)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定删除该记录？')) deleteSalesRecord(record.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
