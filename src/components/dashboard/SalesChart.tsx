'use client';

import { useMemo, useEffect, useState } from 'react';
import { SalesRecord, Sku } from '@/types';
import { addDays, todayStr } from '@/lib/helpers';

interface Props {
  salesRecords: SalesRecord[];
  skus: Sku[];
}

function SimpleBarChart({ data }: { data: { label: string; total: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-full pt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-[10px] text-gray-500 font-medium">{d.total > 0 ? d.total : ''}</span>
          <div
            className="w-full bg-indigo-400 rounded-t"
            style={{ height: `${Math.max(2, (d.total / maxVal) * 85)}%`, minHeight: d.total > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function SalesChart({ salesRecords, skus }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Find the latest date that has actual sales data
  const chartData = useMemo(() => {
    if (salesRecords.length === 0) return [];

    const dates = [...new Set(salesRecords.filter(r => r.salesQuantity > 0).map(r => r.date))].sort();
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : todayStr();

    const result: { date: string; label: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = addDays(latestDate, -i);
      const dayRecords = salesRecords.filter(r => r.date === date);
      const total = dayRecords.reduce((sum, r) => sum + r.salesQuantity, 0);
      result.push({ date, label: `${date.slice(5)}`, total });
    }
    return result;
  }, [salesRecords]);

  if (!mounted) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">📈 近14天销量趋势</h3>
        <div className="h-72 flex items-center justify-center text-sm text-gray-400">加载图表中...</div>
      </div>
    );
  }

  const latestDate = chartData.length > 0 ? chartData[chartData.length - 1].date : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        📈 近14天销量趋势
        {latestDate && <span className="text-xs font-normal text-gray-400 ml-2">（最新数据：{latestDate}）</span>}
      </h3>
      <div style={{ width: '100%', height: 288 }}>
        {chartData.some(d => d.total > 0) ? (
          <SimpleBarChart data={chartData} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            暂无销量数据
          </div>
        )}
      </div>
    </div>
  );
}
