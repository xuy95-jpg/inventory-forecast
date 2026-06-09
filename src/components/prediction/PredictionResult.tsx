'use client';

import { PredictionResult as PredictionResultType, Sku, Store } from '@/types';
import { TrendingUp, Package, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';

interface Props {
  result: PredictionResultType;
  sku: Sku;
  store: Store;
}

export default function PredictionResult({ result, sku, store }: Props) {
  const riskConfig = {
    low: { color: 'bg-green-50 border-green-200 text-green-700', icon: CheckCircle, label: '低风险' },
    medium: { color: 'bg-amber-50 border-amber-200 text-amber-700', icon: AlertTriangle, label: '中风险' },
    high: { color: 'bg-red-50 border-red-200 text-red-700', icon: AlertTriangle, label: '高风险' },
  };

  const risk = riskConfig[result.riskLevel];
  const RiskIcon = risk.icon;

  return (
    <div className="space-y-4">
      {/* Main result cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Predicted Sales */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <TrendingUp size={16} />
            预测销量
          </div>
          <p className="text-3xl font-bold text-gray-900">{result.predictedSales}</p>
          <p className="text-xs text-gray-400 mt-1">个 · {sku.unit}</p>
        </div>

        {/* Available Stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Package size={16} />
            可售库存
          </div>
          <p className="text-3xl font-bold text-gray-900">{result.availableStock}</p>
          <p className="text-xs text-gray-400 mt-1">个 · 当前批次剩余</p>
        </div>

        {/* Suggested Production */}
        <div className="bg-white rounded-xl border border-purple-200 p-4 bg-purple-50/30">
          <div className="flex items-center gap-2 text-sm text-purple-600 mb-2">
            <BarChart3 size={16} />
            建议生产量
          </div>
          <p className="text-3xl font-bold text-purple-700">
            {result.suggestedProduction}
          </p>
          <p className="text-xs text-purple-500 mt-1">
            = 预测{result.predictedSales} - 库存{result.availableStock}
          </p>
        </div>

        {/* Risk Level */}
        <div className={`rounded-xl border p-4 ${risk.color}`}>
          <div className="flex items-center gap-2 text-sm mb-2">
            <RiskIcon size={16} />
            风险等级
          </div>
          <p className="text-2xl font-bold">{risk.label}</p>
          <p className="text-xs mt-1 opacity-70">
            置信度 {(result.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Factors breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 预测因子分解</h4>
        <div className="space-y-2">
          {result.factors.filter(f => f.weight > 0).map((factor, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-20">{factor.name}</span>
              <span className="text-sm text-gray-700 w-16 text-right font-medium">{factor.value}</span>
              <span className="text-xs text-gray-400">× {factor.weight}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{ width: `${factor.weight * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-16 text-right">
                {Math.round(factor.value * factor.weight)}
              </span>
            </div>
          ))}
          {/* Boost factors */}
          {result.factors.filter(f => f.weight === 0 && f.value > 0).map((factor, idx) => (
            <div key={`boost-${idx}`} className="flex items-center gap-4">
              <span className="text-xs text-amber-500 w-20">{factor.name}</span>
              <span className="text-sm text-amber-600 w-16 text-right font-medium">
                +{(factor.value * 100).toFixed(0)}%
              </span>
              <div className="flex-1" />
              <span className="text-xs text-amber-600 w-16 text-right">权重加成</span>
            </div>
          ))}
        </div>

        {/* Formula */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-mono">
            预测 = 昨日×0.35 + 前日×0.20 + 近7日均×0.25 + 上周同期×0.20
            {result.factors.some(f => f.weight === 0 && f.value > 0) && ' × 调整系数'}
          </p>
        </div>
      </div>

      {/* Store & SKU info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          🏪 <span className="font-medium">{store.name}</span>
          <span className="mx-2">·</span>
          📦 <span className="font-medium">{sku.name}</span>
          <span className="mx-2">·</span>
          🕐 保质期 <span className="font-medium">{sku.shelfLife}天</span>
        </div>
        <div className="text-xs text-gray-400">
          预测日期: {result.date}
        </div>
      </div>
    </div>
  );
}
