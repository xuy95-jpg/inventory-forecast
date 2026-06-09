'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { predictAll } from '@/lib/prediction';
import { addDays, todayStr } from '@/lib/helpers';
import { ChevronDown, ChevronRight, Package, TrendingUp, Calculator } from 'lucide-react';

export default function SummaryTable() {
  const { stores, skus, salesRecords, inventoryBatches, holidays } = useData();
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 1));
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const allPredictions = useMemo(() => {
    return predictAll(targetDate, salesRecords, inventoryBatches, holidays, skus, stores);
  }, [targetDate, salesRecords, inventoryBatches, holidays, skus, stores]);

  // Group by store
  const byStore = useMemo(() => {
    const map: Record<string, typeof allPredictions> = {};
    for (const p of allPredictions) {
      if (!map[p.storeId]) map[p.storeId] = [];
      map[p.storeId].push(p);
    }
    return map;
  }, [allPredictions]);

  // Aggregate by SKU across all stores
  const skuAggregation = useMemo(() => {
    const map: Record<string, { totalPredicted: number; totalProduction: number; totalStock: number }> = {};
    for (const p of allPredictions) {
      if (!map[p.skuId]) {
        map[p.skuId] = { totalPredicted: 0, totalProduction: 0, totalStock: 0 };
      }
      map[p.skuId].totalPredicted += p.predictedSales;
      map[p.skuId].totalProduction += p.suggestedProduction;
      map[p.skuId].totalStock += p.availableStock;
    }
    return map;
  }, [allPredictions]);

  const grandTotal = useMemo(() => {
    return allPredictions.reduce((sum, p) => sum + p.suggestedProduction, 0);
  }, [allPredictions]);

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">汇总日期:</span>
        <input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
          min={addDays(todayStr(), 1)}
        />
        <span className="text-sm text-gray-500 ml-auto">
          总生产需求: <span className="text-lg font-bold text-purple-600">{grandTotal}</span> 个
        </span>
      </div>

      {/* SKU cross-store aggregation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calculator size={16} /> 按SKU汇总（跨门店）
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">预测总销量</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">可售库存</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">建议生产</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">状态</th>
              </tr>
            </thead>
            <tbody>
              {skus.map(sku => {
                const agg = skuAggregation[sku.id];
                if (!agg) return null;
                const ratio = agg.totalStock / Math.max(1, agg.totalPredicted);
                const status = ratio >= 1 ? '✅ 充足' : ratio >= 0.6 ? '⚠️ 偏紧' : ratio >= 0.3 ? '🔶 紧张' : '🔴 缺货';
                return (
                  <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-700 font-medium">{sku.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{agg.totalPredicted}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{agg.totalStock}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-bold text-purple-600">{agg.totalProduction}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs">{status}</td>
                  </tr>
                );
              })}
              <tr className="bg-purple-50 font-medium">
                <td className="px-4 py-2.5 text-gray-700">合计</td>
                <td className="px-4 py-2.5 text-right text-gray-900">
                  {Object.values(skuAggregation).reduce((s, a) => s + a.totalPredicted, 0)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {Object.values(skuAggregation).reduce((s, a) => s + a.totalStock, 0)}
                </td>
                <td className="px-4 py-2.5 text-right text-purple-700 font-bold">{grandTotal}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-store detail */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Package size={16} /> 按门店明细
        </h3>
        <div className="space-y-2">
          {stores.map(store => {
            const storePreds = byStore[store.id] || [];
            const storeTotal = storePreds.reduce((s, p) => s + p.suggestedProduction, 0);
            const isExpanded = expandedStore === store.id;

            return (
              <div key={store.id} className="border border-gray-100 rounded-lg">
                <button
                  onClick={() => setExpandedStore(isExpanded ? null : store.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-lg"
                >
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="text-sm font-medium text-gray-700 flex-1 text-left">{store.name}</span>
                  <span className="text-xs text-gray-500">{storePreds.length} SKU</span>
                  <span className="text-sm font-bold text-purple-600 ml-4">生产: {storeTotal} 个</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="py-1.5 text-left text-gray-400">SKU</th>
                          <th className="py-1.5 text-right text-gray-400">预测</th>
                          <th className="py-1.5 text-right text-gray-400">库存</th>
                          <th className="py-1.5 text-right text-gray-400">建议生产</th>
                          <th className="py-1.5 text-right text-gray-400">风险</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storePreds.map(p => {
                          const sku = skus.find(s => s.id === p.skuId);
                          const riskLabels = { low: '🟢', medium: '🟡', high: '🔴' };
                          return (
                            <tr key={p.skuId} className="border-b border-gray-50">
                              <td className="py-1.5 text-gray-700">{sku?.name}</td>
                              <td className="py-1.5 text-right text-gray-900">{p.predictedSales}</td>
                              <td className="py-1.5 text-right text-gray-600">{p.availableStock}</td>
                              <td className="py-1.5 text-right font-medium text-purple-600">{p.suggestedProduction}</td>
                              <td className="py-1.5 text-right">{riskLabels[p.riskLevel]}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
