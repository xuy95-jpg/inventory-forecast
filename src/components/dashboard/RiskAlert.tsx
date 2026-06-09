'use client';

import { RiskItem } from '@/types';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface Props {
  riskItems: RiskItem[];
}

export default function RiskAlert({ riskItems }: Props) {
  if (riskItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">⚠️ 库存风险提醒</h3>
        <div className="flex items-center gap-2 text-sm text-green-600 py-4">
          <span>✅</span> 当前无风险库存，所有批次状态良好
        </div>
      </div>
    );
  }

  const redItems = riskItems.filter(r => r.riskLevel === 'red');
  const yellowItems = riskItems.filter(r => r.riskLevel === 'yellow');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        ⚠️ 库存风险提醒
        <span className="ml-2 text-xs font-normal text-red-500">
          {riskItems.length} 项风险
        </span>
      </h3>

      <div className="space-y-3">
        {/* Red alerts first */}
        {redItems.map(item => (
          <div
            key={item.batchId}
            className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-700">
                  🚨 {item.skuName}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-red-200 text-red-700 rounded">
                  剩余 {item.daysUntilExpiry} 天过期
                </span>
              </div>
              <div className="text-xs text-red-600 mt-1">
                {item.storeName} · 剩余 {item.remainingQuantity} 块
              </div>
              <div className="text-xs text-red-500 mt-1">
                建议：优先销售 / 参与促销 / 盲盒消化
              </div>
            </div>
          </div>
        ))}

        {/* Yellow alerts */}
        {yellowItems.map(item => (
          <div
            key={item.batchId}
            className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-amber-700">
                  ⚠️ {item.skuName}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded">
                  剩余 {item.daysUntilExpiry} 天过期
                </span>
              </div>
              <div className="text-xs text-amber-600 mt-1">
                {item.storeName} · 剩余 {item.remainingQuantity} 块
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
