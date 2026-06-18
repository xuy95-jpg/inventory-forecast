'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { predictTwoDay } from '@/lib/prediction';
import { getSplitStock } from '@/lib/inventory';
import { addDays, todayStr } from '@/lib/helpers';
import { Calculator, History, Download } from 'lucide-react';

export default function SummaryTable() {
  const { stores, skus, salesRecords, inventoryBatches, productionPlans } = useData();
  const storeId = stores[0]?.id || 'store-001';
  const activeSkus = useMemo(() => skus.filter(s => s.active), [skus]);

  const latestDataDate = useMemo(() => {
    if (salesRecords.length === 0) return todayStr();
    const dates = [...new Set(salesRecords.filter(r => r.salesQuantity > 0).map(r => r.date))].sort();
    return dates.length > 0 ? dates[dates.length - 1] : todayStr();
  }, [salesRecords]);

  const [targetDate, setTargetDate] = useState(addDays(latestDataDate, 1));
  const isPast = targetDate <= latestDataDate;

  // Historical view: sales + EOD stock + production plan + current stock reference
  const historyData = useMemo(() => {
    if (!isPast) return [];
    return activeSkus.map(sku => {
      const record = salesRecords.find(r => r.date === targetDate && r.storeId === storeId && r.skuId === sku.id);
      const plan = productionPlans.find(p => p.date === targetDate && p.storeId === storeId && p.skuId === sku.id);
      const stock = getSplitStock(inventoryBatches, storeId, sku.id, sku.category);
      return {
        sku,
        salesQty: record?.salesQuantity || 0,
        eodCut: record?.cutStock || 0,
        eodWhole: record?.wholeStock || 0,
        wastage: record?.wastage || 0,
        soldOut: record?.soldOut || false,
        curCut: stock.cut,
        curWhole: stock.whole,
        curTotal: stock.total,
        aiSuggested: plan?.suggestedQuantity ?? null,
        actualProd: plan?.actualQuantity ?? null,
        wasPlanned: !!plan,
      };
    }).filter(d => d.salesQty > 0 || d.eodCut > 0 || d.eodWhole > 0 || d.wasPlanned);
  }, [isPast, targetDate, activeSkus, salesRecords, storeId, productionPlans, inventoryBatches]);

  const totalSales = useMemo(() => historyData.reduce((s, d) => s + d.salesQty, 0), [historyData]);
  const totalProd = useMemo(() => historyData.reduce((s, d) => s + (d.actualProd || 0), 0), [historyData]);

  // Prediction view
  const predictionData = useMemo(() => {
    if (isPast) return [];
    return activeSkus.filter(s => s.category !== 'OMAKASE').map(sku => ({ sku, pred: predictTwoDay(targetDate, storeId, sku.id, salesRecords, inventoryBatches, sku.category) }))
      .filter(p => p.pred.totalStock > 0 || p.pred.twoDayTotal > 0);
  }, [isPast, targetDate, storeId, activeSkus, salesRecords, inventoryBatches]);

  const grandTotal = useMemo(() => predictionData.reduce((s, p) => s + p.pred.suggestedUnits, 0), [predictionData]);

  const handleExport = () => {
    let csv: string;
    if (isPast) {
      csv = 'SKU,销量(块),盘存切角,盘存整模,报损,售罄,当前切角库存,当前整模库存,AI建议制作,实际制作\n';
      historyData.forEach(d => { csv += d.sku.name + ',' + d.salesQty + ',' + d.eodCut + ',' + d.eodWhole + ',' + d.wastage + ',' + (d.soldOut?'是':'否') + ',' + d.curCut + ',' + d.curWhole + ',' + (d.aiSuggested??'') + ',' + (d.actualProd??'') + '\n'; });
    } else {
      csv = 'SKU,切角库存,整模库存,总库存,明天预测,后天预测,两日总需,缺口,建议制作,风险\n';
      predictionData.forEach(({ sku, pred }) => { csv += sku.name + ',' + pred.cutStock + ',' + pred.wholeStock + ',' + pred.totalStock + ',' + pred.tomorrowSales + ',' + pred.dayAfterSales + ',' + pred.twoDayTotal + ',' + pred.shortage + ',' + pred.suggestedUnits + ',' + pred.riskLevel + '\n'; });
    }
    const blob = new Blob(['﻿' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'nana-' + targetDate + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">日期:</span>
        <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
        <span className={`text-xs px-2 py-1 rounded-full ${isPast ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{isPast ? '📋 历史数据' : '🔮 预测模式'}</span>
        <button onClick={handleExport} className="ml-auto px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Download size={12} /> 导出CSV</button>
        {isPast && <span className="text-sm text-gray-500">当日销量: <span className="text-lg font-bold text-blue-600">{totalSales}</span> 块 | 实际制作: <span className="text-lg font-bold text-green-600">{totalProd}</span> 个</span>}
        {!isPast && <span className="text-sm text-gray-500">总制作: <span className="text-lg font-bold text-purple-600">{grandTotal}</span> 个</span>}
      </div>

      {isPast && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><History size={16} /> {targetDate} 实际销售 · 库存 · 制作</h3>
          {historyData.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">该日期无数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-blue-600">销量(块)</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500">盘存切角</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500">盘存整模</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500">报损</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-500">售罄</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-purple-600">AI建议(个)</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-green-600">实际制作(个)</th>
                    <th className="px-2 py-2.5 text-center text-xs font-medium text-gray-400">当前库存(块)</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map(d => {
                    const prodDiff = d.wasPlanned && d.actualProd !== d.aiSuggested;
                    return (
                      <tr key={d.sku.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${d.wasPlanned ? 'bg-green-50/30' : ''}`}>
                        <td className="px-3 py-2.5 text-gray-700 font-medium">{d.sku.name}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-blue-600">{d.salesQty > 0 ? d.salesQty : '-'}</td>
                        <td className="px-2 py-2.5 text-center text-gray-600">{d.eodCut > 0 ? d.eodCut : '-'}</td>
                        <td className="px-2 py-2.5 text-center text-gray-600">{d.eodWhole > 0 ? d.eodWhole : '-'}</td>
                        <td className="px-2 py-2.5 text-center text-red-500">{d.wastage > 0 ? d.wastage : '-'}</td>
                        <td className="px-2 py-2.5 text-center">{d.soldOut ? '🔥' : ''}</td>
                        <td className="px-2 py-2.5 text-center text-purple-600 font-medium">{d.aiSuggested ?? '-'}</td>
                        <td className={`px-2 py-2.5 text-center font-bold ${prodDiff ? 'text-amber-600' : 'text-green-600'}`}>
                          {d.actualProd ?? '-'}
                          {prodDiff && <span className="text-xs ml-1">(改)</span>}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-400 text-xs">{d.curTotal}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-50 font-medium">
                    <td className="px-3 py-2.5 text-gray-700">合计</td>
                    <td className="px-2 py-2.5 text-center text-blue-700 font-bold">{totalSales}</td>
                    <td className="px-2 py-2.5 text-center">{historyData.reduce((s,d)=>s+d.eodCut,0)}</td>
                    <td className="px-2 py-2.5 text-center">{historyData.reduce((s,d)=>s+d.eodWhole,0)}</td>
                    <td className="px-2 py-2.5 text-center text-red-500">{historyData.reduce((s,d)=>s+d.wastage,0) || '-'}</td>
                    <td></td>
                    <td></td>
                    <td className="px-2 py-2.5 text-center text-green-700 font-bold">{totalProd}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isPast && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calculator size={16} /> 按SKU预测</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">切角库存</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">整模</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">总库存</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">两日预测</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">缺口</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">制作(个)</th>
                  <th className="px-2 py-2.5 text-right text-xs font-medium text-gray-500">风险</th>
                </tr>
              </thead>
              <tbody>
                {predictionData.map(({ sku, pred }) => (
                  <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 text-gray-700 font-medium">{sku.name}</td>
                    <td className="px-2 py-2.5 text-right text-gray-600">{pred.cutStock}</td>
                    <td className="px-2 py-2.5 text-right text-gray-600">{pred.wholeStock}</td>
                    <td className="px-2 py-2.5 text-right font-medium text-gray-900">{pred.totalStock}</td>
                    <td className="px-2 py-2.5 text-right text-gray-700">{pred.twoDayTotal}</td>
                    <td className="px-2 py-2.5 text-right">{pred.shortage > pred.threshold ? <span className="text-red-600 font-bold">{pred.shortage}</span> : <span className="text-gray-400">{pred.shortage}</span>}</td>
                    <td className="px-2 py-2.5 text-right font-bold text-purple-600">{pred.suggestedUnits || '-'}</td>
                    <td className="px-2 py-2.5 text-right text-xs">{pred.riskLevel === 'high' ? '🔴' : pred.riskLevel === 'medium' ? '🟡' : '🟢'}</td>
                  </tr>
                ))}
                <tr className="bg-purple-50 font-medium">
                  <td className="px-3 py-2.5 text-gray-700">合计</td>
                  <td className="px-2 py-2.5 text-right">{predictionData.reduce((s,p)=>s+p.pred.cutStock,0)}</td>
                  <td className="px-2 py-2.5 text-right">{predictionData.reduce((s,p)=>s+p.pred.wholeStock,0)}</td>
                  <td className="px-2 py-2.5 text-right text-gray-900">{predictionData.reduce((s,p)=>s+p.pred.totalStock,0)}</td>
                  <td className="px-2 py-2.5 text-right text-gray-700">{predictionData.reduce((s,p)=>s+p.pred.twoDayTotal,0)}</td>
                  <td></td>
                  <td className="px-2 py-2.5 text-right text-purple-700 font-bold">{grandTotal}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
