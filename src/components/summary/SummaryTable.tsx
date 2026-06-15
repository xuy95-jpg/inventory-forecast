'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { predictTwoDay } from '@/lib/prediction';
import { getSplitStock } from '@/lib/inventory';
import { addDays, todayStr } from '@/lib/helpers';
import { ChevronDown, ChevronRight, Package, Calculator } from 'lucide-react';

export default function SummaryTable() {
  const { stores, skus, salesRecords, inventoryBatches } = useData();
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 1));
  const storeId = stores[0]?.id || 'store-001';

  const allPredictions = useMemo(() =>
    skus.map(sku => ({ sku, pred: predictTwoDay(targetDate, storeId, sku.id, salesRecords, inventoryBatches) }))
      .filter(p => p.pred.totalStock > 0 || p.pred.twoDayTotal > 0),
  [targetDate, storeId, skus, salesRecords, inventoryBatches]);

  const grandTotal = useMemo(() =>
    allPredictions.reduce((s, p) => s + p.pred.suggestedUnits, 0),
  [allPredictions]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">汇总日期:</span>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" min={addDays(todayStr(), 1)} />
        <span className="text-sm text-gray-500 ml-auto">总制作需求: <span className="text-lg font-bold text-purple-600">{grandTotal}</span> 个</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calculator size={16} /> 按SKU汇总</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">已切库存</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">整模库存</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">总库存(块)</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">两日预测</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">建议制作(个)</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">风险</th>
            </tr>
          </thead>
          <tbody>
            {allPredictions.map(({ sku, pred }) => (
              <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-700 font-medium">{sku.name}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{pred.cutStock}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{pred.wholeStock}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{pred.totalStock}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{pred.twoDayTotal}</td>
                <td className="px-4 py-2.5 text-right font-bold text-purple-600">{pred.suggestedUnits}</td>
                <td className="px-4 py-2.5 text-right text-xs">
                  {pred.riskLevel === 'high' ? '🔴' : pred.riskLevel === 'medium' ? '🟡' : '🟢'}
                </td>
              </tr>
            ))}
            <tr className="bg-purple-50 font-medium">
              <td className="px-4 py-2.5 text-gray-700">合计</td>
              <td className="px-4 py-2.5 text-right">{allPredictions.reduce((s,p)=>s+p.pred.cutStock,0)}</td>
              <td className="px-4 py-2.5 text-right">{allPredictions.reduce((s,p)=>s+p.pred.wholeStock,0)}</td>
              <td className="px-4 py-2.5 text-right text-gray-900">{allPredictions.reduce((s,p)=>s+p.pred.totalStock,0)}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">{allPredictions.reduce((s,p)=>s+p.pred.twoDayTotal,0)}</td>
              <td className="px-4 py-2.5 text-right text-purple-700 font-bold">{grandTotal}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
