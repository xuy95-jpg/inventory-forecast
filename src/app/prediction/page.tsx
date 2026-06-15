'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { predictTwoDay, TwoDayPrediction } from '@/lib/prediction';
import { getSplitStock } from '@/lib/inventory';
import { addDays, todayStr } from '@/lib/helpers';
import { Check, AlertTriangle, TrendingUp, Package } from 'lucide-react';

export default function PredictionPage() {
  const { stores, skus, salesRecords, inventoryBatches, saveProductionPlan } = useData();
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 1));
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);

  const storeId = stores[0]?.id || 'store-001';

  // Predict all SKUs
  const predictions = useMemo(() => {
    return skus.map(sku => {
      const pred = predictTwoDay(targetDate, storeId, sku.id, salesRecords, inventoryBatches);
      return { sku, pred };
    }).filter(p => {
      // Filter only products with stock or sales history
      const hasStock = getSplitStock(inventoryBatches, storeId, p.sku.id).total > 0;
      const hasSales = salesRecords.some(r => r.storeId === storeId && r.skuId === p.sku.id && r.salesQuantity > 0);
      return hasStock || hasSales;
    });
  }, [targetDate, storeId, skus, salesRecords, inventoryBatches]);

  const grandTotal = useMemo(() => {
    return predictions.reduce((s, p) => s + (edits[p.sku.id] ?? p.pred.suggestedUnits), 0);
  }, [predictions, edits]);

  const handleConfirm = () => {
    const now = new Date().toISOString();
    predictions.forEach(({ sku, pred }) => {
      const actualUnits = edits[sku.id] ?? pred.suggestedUnits;
      if (actualUnits > 0) {
        saveProductionPlan({
          date: targetDate, storeId, skuId: sku.id,
          suggestedQuantity: pred.suggestedUnits,
          actualQuantity: actualUnits,
          confirmedAt: now, notes: '',
        });
      }
    });
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  const riskColor = (level: string) =>
    level === 'high' ? 'text-red-600 bg-red-50' : level === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI 预测 & 生产计划</h1>
          <p className="text-sm text-gray-500 mt-1">两日库存流转 · 建议生产量</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">生产日期</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" min={addDays(todayStr(), 1)} />
          </div>
          <button onClick={handleConfirm}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 flex items-center gap-2">
            <Check size={16} /> 批量确认全部生产计划
          </button>
        </div>
      </div>

      {confirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">✅ 生产计划已确认！</div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <Package size={18} className="text-blue-500" />
          <div><div className="text-xs text-gray-500">当前总库存</div>
          <div className="text-lg font-bold">{predictions.reduce((s, p) => s + p.pred.totalStock, 0)} 块</div></div>
        </div>
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <TrendingUp size={18} className="text-purple-500" />
          <div><div className="text-xs text-gray-500">两日预测总需求</div>
          <div className="text-lg font-bold">{predictions.reduce((s, p) => s + p.pred.twoDayTotal, 0)} 块</div></div>
        </div>
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500" />
          <div><div className="text-xs text-gray-500">合计制作</div>
          <div className="text-lg font-bold">{grandTotal} 个</div></div>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">已切库存</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">整模库存</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">总库存(块)</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">明天预测</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">后天预测</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">两日总需求</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">建议(块)</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-700">制作(个)</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">风险</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map(({ sku, pred }) => {
              const editVal = edits[sku.id] !== undefined ? edits[sku.id] : pred.suggestedUnits;
              return (
                <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{sku.name}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{pred.cutStock}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{pred.wholeStock}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-gray-900">{pred.totalStock}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{pred.tomorrowSales}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700">{pred.dayAfterSales}</td>
                  <td className="px-3 py-2.5 text-center font-medium">{pred.twoDayTotal}</td>
                  <td className="px-3 py-2.5 text-center text-purple-600 font-medium">{pred.suggestedBlocks}</td>
                  <td className="px-2 py-2.5 text-center">
                    <input type="number" min={0} value={editVal}
                      onChange={e => setEdits({ ...edits, [sku.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center font-bold text-gray-900 focus:ring-2 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${riskColor(pred.riskLevel)}`}>
                      {pred.riskLevel === 'high' ? '高' : pred.riskLevel === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
