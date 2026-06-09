'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { SalesRecord } from '@/types';
import { addDays, todayStr } from '@/lib/helpers';

interface Props {
  salesRecords: SalesRecord[];
  storeId: string;
  skuId: string;
  predictionDate: string;
  predictedSales: number;
}

export default function HistoryChart({
  salesRecords,
  storeId,
  skuId,
  predictionDate,
  predictedSales,
}: Props) {
  const today = todayStr();

  // Build chart data: last 14 days + prediction
  const chartData: { date: string; label: string; 销量: number; 预测?: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i);
    const record = salesRecords.find(
      r => r.date === date && r.storeId === storeId && r.skuId === skuId
    );
    chartData.push({
      date,
      label: `${date.slice(5)}`,
      销量: record?.salesQuantity ?? 0,
    });
  }

  // Add prediction point
  chartData.push({
    date: predictionDate,
    label: `${predictionDate.slice(5)} 🔮`,
    销量: 0,
    预测: predictedSales,
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">📈 历史销量 + 预测</h3>
      <div className="h-64">
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
            <ReferenceLine
              x={chartData[chartData.length - 2]?.label}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: '今天', position: 'top', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="销量"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="实际销量"
            />
            <Line
              type="monotone"
              dataKey="预测"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#f59e0b', stroke: '#f59e0b' }}
              name="AI预测"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
