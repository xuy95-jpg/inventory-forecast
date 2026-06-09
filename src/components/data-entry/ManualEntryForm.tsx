'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr, getDayOfWeek, isWeekend, isHoliday, getHolidayName } from '@/lib/helpers';
import { Plus, Save } from 'lucide-react';

export default function ManualEntryForm() {
  const { stores, skus, addSalesRecord, holidays } = useData();

  const [date, setDate] = useState(todayStr());
  const [storeId, setStoreId] = useState(stores[0]?.id || '');
  const [skuId, setSkuId] = useState(skus[0]?.id || '');
  const [salesQuantity, setSalesQuantity] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [actualProduction, setActualProduction] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dayOfWeek = getDayOfWeek(date);
  const weekend = isWeekend(date);
  const holiday = isHoliday(date, holidays);
  const holidayName = getHolidayName(date, holidays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sales = parseInt(salesQuantity);
    const stock = parseInt(stockQuantity);

    if (isNaN(sales) || sales < 0) {
      setMessage({ type: 'error', text: '请输入有效销量' });
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setMessage({ type: 'error', text: '请输入有效库存' });
      return;
    }

    const prod = actualProduction ? parseInt(actualProduction) : null;
    if (actualProduction && (prod === null || prod < 0)) {
      setMessage({ type: 'error', text: '请输入有效生产量' });
      return;
    }

    addSalesRecord({
      date,
      storeId,
      skuId,
      salesQuantity: sales,
      stockQuantity: stock,
      actualProduction: prod,
    });

    setMessage({ type: 'success', text: '✅ 录入成功！' });
    setSalesQuantity('');
    setStockQuantity('');
    setActualProduction('');

    setTimeout(() => setMessage(null), 2000);
  };

  const skuInfo = skus.find(s => s.id === skuId);
  const storeInfo = stores.find(s => s.id === storeId);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Plus size={16} /> 手动录入
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">日期 *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <div className="flex gap-1 mt-1">
            <span className="text-xs text-gray-400">{dayOfWeek}</span>
            {weekend && <span className="text-xs text-blue-500 font-medium">周末</span>}
            {holiday && <span className="text-xs text-red-500 font-medium">🎉 {holidayName}</span>}
          </div>
        </div>

        {/* Store */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">门店 *</label>
          <select
            value={storeId}
            onChange={e => setStoreId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* SKU */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">SKU *</label>
          <select
            value={skuId}
            onChange={e => setSkuId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {skus.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}（保质期{s.shelfLife}天）
              </option>
            ))}
          </select>
        </div>

        {/* Production (optional) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">实际生产量</label>
          <input
            type="number"
            min="0"
            value={actualProduction}
            onChange={e => setActualProduction(e.target.value)}
            placeholder="可选"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sales */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">当日销量 *</label>
          <input
            type="number"
            min="0"
            value={salesQuantity}
            onChange={e => setSalesQuantity(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Stock */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">当日盘点库存 *</label>
          <input
            type="number"
            min="0"
            value={stockQuantity}
            onChange={e => setStockQuantity(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Metadata display */}
      <div className="flex gap-4 text-xs text-gray-400">
        {skuInfo && <span>保质期: {skuInfo.shelfLife}天</span>}
        {storeInfo && <span>区域: {storeInfo.region}</span>}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Save size={14} />
          保存记录
        </button>
        {message && (
          <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
