'use client';

import { useData } from '@/context/DataContext';
import { todayStr, formatDisplayDate } from '@/lib/helpers';

export default function Header() {
  const { stores, skus, salesRecords } = useData();
  const today = todayStr();

  const todaySales = salesRecords
    .filter(r => r.date === today)
    .reduce((sum, r) => sum + r.salesQuantity, 0);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-sm font-medium text-gray-700">
          📅 {formatDisplayDate(today)}
        </h2>
      </div>
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <span>🏪 {stores.length} 家门店</span>
        <span>📦 {skus.length} 个SKU</span>
        <span className="font-medium text-gray-700">今日销量: {todaySales}</span>
      </div>
    </header>
  );
}
