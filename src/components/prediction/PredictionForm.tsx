'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { addDays, todayStr, getDayOfWeek, isWeekend, isHoliday, getHolidayName } from '@/lib/helpers';
import { Search, Sparkles } from 'lucide-react';

interface Props {
  onPredict: (date: string, storeId: string, skuId: string) => void;
  loading: boolean;
}

export default function PredictionForm({ onPredict, loading }: Props) {
  const { stores, skus, holidays } = useData();

  const tomorrow = addDays(todayStr(), 1);
  const [date, setDate] = useState(tomorrow);
  const [storeId, setStoreId] = useState(stores[0]?.id || '');
  const [skuId, setSkuId] = useState(skus[0]?.id || '');

  const dayOfWeek = getDayOfWeek(date);
  const weekend = isWeekend(date);
  const holiday = isHoliday(date, holidays);
  const holidayName = getHolidayName(date, holidays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPredict(date, storeId, skuId);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-purple-500" />
        <h3 className="text-sm font-semibold text-gray-800">预测参数</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Target Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">预测日期</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            min={tomorrow}
          />
          <div className="flex gap-1 mt-1">
            <span className="text-xs text-gray-400">{dayOfWeek}</span>
            {weekend && <span className="text-xs text-blue-500 font-medium">周末</span>}
            {holiday && <span className="text-xs text-red-500 font-medium">🎉 {holidayName}</span>}
          </div>
        </div>

        {/* Store */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">门店</label>
          <select
            value={storeId}
            onChange={e => setStoreId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* SKU */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
          <select
            value={skuId}
            onChange={e => setSkuId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {skus.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Quick buttons */}
        <div className="flex flex-col gap-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">快捷选择</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setDate(addDays(todayStr(), 1)); handleSubmit({ preventDefault: () => {} } as React.FormEvent); }}
              className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              明日
            </button>
            <button
              type="button"
              onClick={() => { setDate(addDays(todayStr(), 2)); handleSubmit({ preventDefault: () => {} } as React.FormEvent); }}
              className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              后日
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Search size={16} />
        {loading ? '预测中...' : '开始预测'}
      </button>
    </form>
  );
}
