'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { SalesRecord, Sku } from '@/types';
import { addDays, formatDisplayDate, todayStr } from '@/lib/helpers';

interface Props {
  salesRecords: SalesRecord[];
  skus: Sku[];
}

export default function SalesChart({ salesRecords, skus }: Props) {
  // 生成最近 14 天的每日总销量
  const today = todayStr();
  const chartData: { date: string; label: string; [key: string]: string | number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i);
    const dayRecords = salesRecords.filter(r => r.date === date);
    const total = dayRecords.reduce((sum, r) => sum + r.salesQuantity, 0);

    const entry: { date: string; label: string; [key: string]: string | number } = {
      date,
      label: `${date.slice(5)}`,
      总销量: total,
    };

    // Top 3 SKUs trend
    const top3 = skus.slice(0, 3);
    for (const sku of top3) {
      const skuTotal = dayRecords
        .filter(r => r.skuId === sku.id)
        .reduce((sum, r) => sum + r.salesQuantity, 0);
      entry[sku.name] = skuTotal;
    }

    chartData.push(entry);
  }

  const top3 = skus.slice(0, 3);
  const colors = ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">📈 近14天销量趋势</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
            />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="总销量"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            {top3.map((sku, i) => (
              <Line
                key={sku.id}
                type="monotone"
                dataKey={sku.name}
                stroke={colors[i]}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
