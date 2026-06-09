'use client';

import { RiskItem } from '@/types';
import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';

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
  const redTotal = redItems.reduce((s, r) => s + r.remainingQuantity, 0);
  const yellowTotal = yellowItems.reduce((s, r) => s + r.remainingQuantity, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">
          ⚠️ 库存风险提醒
        </h3>
        <div className="flex gap-3 text-xs">
          {redItems.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
              🔴 {redItems.length} 项紧急 · {redTotal} 块
            </span>
          )}
          {yellowItems.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
              🟡 {yellowItems.length} 项关注 · {yellowTotal} 块
            </span>
          )}
        </div>
      </div>

      {/* Grading legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-400">
        <span>🔴 红色 = 剩余 ≤1 天过期，建议优先销售 / 促销 / 盲盒消化</span>
        <span>🟡 黄色 = 剩余 ≤2 天过期，关注监控</span>
      </div>

      <div className="space-y-3">
        {/* ====== RED: 1 day remaining ====== */}
        {redItems.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle size={14} />
              🚨 紧急处理（≤1天过期）
            </h4>
            <div className="space-y-2">
              {redItems.map(item => (
                <div
                  key={item.batchId}
                  className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-700">
                        {item.skuName}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-red-200 text-red-700 rounded font-medium">
                        剩 {item.daysUntilExpiry} 天
                      </span>
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      {item.storeName} · 库存批次剩余 {item.remainingQuantity} 块
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      建议：立即优先销售 / 参与促销活动 / 进入盲盒消化
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-red-300 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== YELLOW: 2 days remaining ====== */}
        {yellowItems.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1 mt-3">
              <AlertTriangle size={14} />
              ⚠️ 关注监控（≤2天过期）
            </h4>
            <div className="space-y-2">
              {yellowItems.map(item => (
                <div
                  key={item.batchId}
                  className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-amber-700">
                        {item.skuName}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-700 rounded font-medium">
                        剩 {item.daysUntilExpiry} 天
                      </span>
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      {item.storeName} · 库存批次剩余 {item.remainingQuantity} 块
                    </div>
                    <div className="text-xs text-amber-500 mt-1">
                      建议：密切关注 / 优先排产该SKU
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-300 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
