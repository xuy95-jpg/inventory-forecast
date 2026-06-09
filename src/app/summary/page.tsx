'use client';

import SummaryTable from '@/components/summary/SummaryTable';

export default function SummaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">总汇总</h1>
        <p className="text-sm text-gray-500 mt-1">跨门店SKU汇总与总生产需求统计</p>
      </div>

      <SummaryTable />
    </div>
  );
}
