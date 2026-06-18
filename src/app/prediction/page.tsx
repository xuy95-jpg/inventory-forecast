'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { predictTwoDay, applyOmakaseSplit, TwoDayPrediction } from '@/lib/prediction';
import { getSplitStock } from '@/lib/inventory';
import { addDays, todayStr } from '@/lib/helpers';
import { Check, AlertTriangle, TrendingUp, Package } from 'lucide-react';

export default function PredictionPage() {
  const { stores, skus, salesRecords, inventoryBatches, saveProductionPlan, savePredictionRecords } = useData();
  const storeId = stores[0]?.id || 'store-001';
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 1));
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);

  // Predict all active SKUs (non-OMAKASE first, then OMAKASE)
  const activeSkus = useMemo(() => skus.filter(s => s.active), [skus]);
  const nonOmSkus = useMemo(() => activeSkus.filter(s => s.category !== 'OMAKASE'), [activeSkus]);
  const omSku = useMemo(() => activeSkus.find(s => s.category === 'OMAKASE'), [activeSkus]);

  const predictions = useMemo(() => {
    let preds: (TwoDayPrediction & { skuName: string })[] = [];
    for (const sku of nonOmSkus) {
      const pred = predictTwoDay(targetDate, storeId, sku.id, salesRecords, inventoryBatches, sku.category);
      preds.push({ ...pred, skuName: sku.name });
    }
    // Apply OMAKASE split
    if (omSku) {
      const omPred = predictTwoDay(targetDate, storeId, omSku.id, salesRecords, inventoryBatches, 'OMAKASE');
      preds = applyOmakaseSplit(omPred, preds, skus) as (TwoDayPrediction & { skuName: string })[];
      // Also insert OMAKASE display row (no production)
      const omIdx = preds.findIndex(p => p.skuId === preds[0]?.skuId);
      preds.push({ ...omPred, skuName: omSku.name });
    }
    // Only show SKUs with stock or sales history
    return preds.filter(p => p.totalStock > 0 || p.twoDayTotal > 0);
  }, [targetDate, storeId, nonOmSkus, omSku, salesRecords, inventoryBatches, skus]);

  const grandTotal = useMemo(() => {
    return predictions.filter(p => !p.isOmakase).reduce((s, p) => s + (edits[p.skuId] ?? p.suggestedUnits), 0);
  }, [predictions, edits]);

  const handleConfirm = () => {
    const now = new Date().toISOString();
    // Save prediction records for tracking
    const predRecs = predictions.filter(p => !p.isOmakase).map(p => ({
      date: targetDate, storeId, skuId: p.skuId,
      predictedTomorrowSales: p.tomorrowSales, predictedDayAfterSales: p.dayAfterSales,
      predictedProductionBlocks: p.suggestedBlocks, predictedProductionUnits: edits[p.skuId] ?? p.suggestedUnits,
      actualSales: null, actualProduction: null, wastage: 0, soldOut: false, createdAt: now,
    }));
    savePredictionRecords(predRecs);

    // Save production plans
    predictions.filter(p => !p.isOmakase).forEach(p => {
      const actualUnits = edits[p.skuId] ?? p.suggestedUnits;
      if (actualUnits > 0) saveProductionPlan({ date: targetDate, storeId, skuId: p.skuId, suggestedQuantity: p.suggestedUnits, actualQuantity: actualUnits, confirmedAt: now, notes: '' });
    });
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  const riskColor = (l: string) => l === 'high' ? 'text-red-600 bg-red-50' : l === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';

  const showSkus = activeSkus.filter(s => s.category !== 'OMAKASE').map(s => {
    const pred = predictions.find(p => p.skuId === s.id);
    if (!pred || (pred.totalStock === 0 && pred.twoDayTotal === 0 && !pred.isOmakase)) return null;
    return { sku: s, pred };
  }).filter(Boolean) as { sku: typeof skus[0]; pred: TwoDayPrediction & { skuName: string } }[];

  const omakasePred = predictions.find(p => p.isOmakase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI 预测 & 生产计划</h1>
          <p className="text-sm text-gray-500 mt-1">两日库存流转 · 阈值生产建议</p>
        </div>
        <div className="flex items-center gap-4">
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          <button onClick={handleConfirm} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 flex items-center gap-2">
            <Check size={16} /> 一键确认生产计划
          </button>
        </div>
      </div>

      {confirmed && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">✅ 生产计划已确认！预测数据已存档。</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <Package size={18} className="text-blue-500" />
          <div><div className="text-xs text-gray-500">当前总库存</div><div className="text-lg font-bold">{showSkus.reduce((s,{pred})=>s+pred.totalStock,0)} 块</div></div>
        </div>
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <TrendingUp size={18} className="text-purple-500" />
          <div><div className="text-xs text-gray-500">两日预测总需求</div><div className="text-lg font-bold">{showSkus.reduce((s,{pred})=>s+pred.twoDayTotal,0)} 块</div></div>
        </div>
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500" />
          <div><div className="text-xs text-gray-500">合计制作</div><div className="text-lg font-bold">{grandTotal} 个</div></div>
        </div>
      </div>

      {/* OMAKASE info */}
      {omakasePred && omakasePred.twoDayTotal > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          🍰 OMAKASE 预测 {omakasePred.tomorrowSales}+{omakasePred.dayAfterSales}={omakasePred.twoDayTotal} 份 — 已折算到咸芝士/香爆了/苦巧碎银子/牛肝菌（1/18 per SKU），不单独生产
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">切角库存</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">整模</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">总库存</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">明天预测</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">后天预测</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">两日总需</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">日均</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">等级</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">缺口</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-700">制作(个)</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500">风险</th>
            </tr>
          </thead>
          <tbody>
            {showSkus.map(({ sku, pred }) => {
              if (pred.isOmakase) return null;
              const EditVal = edits[pred.skuId] !== undefined ? edits[pred.skuId] : pred.suggestedUnits;
              const willProduce = pred.shortage > pred.threshold;
              return (
                <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-2.5 font-medium text-gray-800">{sku.name}</td>
                  <td className="px-2 py-2.5 text-center text-gray-600">{pred.cutStock}</td>
                  <td className="px-2 py-2.5 text-center text-gray-600">{pred.wholeStock}</td>
                  <td className="px-2 py-2.5 text-center font-medium text-gray-900">{pred.totalStock}</td>
                  <td className="px-2 py-2.5 text-center text-gray-700">{pred.tomorrowSales}</td>
                  <td className="px-2 py-2.5 text-center text-gray-700">{pred.dayAfterSales}</td>
                  <td className="px-2 py-2.5 text-center font-medium">{pred.twoDayTotal}</td>
                  <td className="px-2 py-2.5 text-center text-gray-500">{pred.dailyAvg.toFixed(1)}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${pred.tier === '大款' ? 'bg-blue-100 text-blue-700' : pred.tier === '中款' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{pred.tier}</span>
                  </td>
                  <td className={`px-2 py-2.5 text-center ${willProduce ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {pred.shortage}{willProduce ? '' : <span className='text-xs ml-1'>(≤{pred.threshold})</span>}
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    {willProduce ? (
                      <input type="number" min={0} value={EditVal} onChange={e => setEdits({ ...edits, [pred.skuId]: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-14 px-1.5 py-1 border border-blue-300 rounded text-sm text-center font-bold text-gray-900 bg-blue-50" />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center"><span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${riskColor(pred.riskLevel)}`}>{pred.riskLevel === 'high' ? '高' : pred.riskLevel === 'medium' ? '中' : '低'}</span></td>
                </tr>
              );
            })}
            {/* OMAKASE display row */}
            {omakasePred && omakasePred.twoDayTotal > 0 && (
              <tr className="border-b border-gray-50 bg-amber-50/30">
                <td className="px-3 py-2.5 font-medium text-gray-800">🍰 OMAKASE</td>
                <td className="px-2 py-2.5 text-center text-gray-400" colSpan={3}>拼盘(四品各1/18折算)</td>
                <td className="px-2 py-2.5 text-center text-gray-700">{omakasePred.tomorrowSales}</td>
                <td className="px-2 py-2.5 text-center text-gray-700">{omakasePred.dayAfterSales}</td>
                <td className="px-2 py-2.5 text-center font-medium">{omakasePred.twoDayTotal}</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{omakasePred.dailyAvg.toFixed(1)}</td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-400" colSpan={4}>已折算到母品，不单独生产</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400 bg-white rounded-lg border p-3">
        生产阈值: 大款(日均≥12) 缺口&gt;1块→做 | 中款(日均≥5) 缺口&gt;3块→做 | 小款(日均&lt;5) 缺口&gt;4块→做
      </div>
    </div>
  );
}
