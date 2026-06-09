'use client';

import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { predictAll } from '@/lib/prediction';
import { createBatchFromPlan } from '@/lib/inventory';
import { addDays, todayStr } from '@/lib/helpers';
import { Check, Edit3, Save, Clock, X } from 'lucide-react';
import { ProductionPlan } from '@/types';

export default function PlanTable() {
  const {
    stores, skus, salesRecords, inventoryBatches,
    holidays, productionPlans,
    addProductionPlan, confirmProductionPlan, addInventoryBatch,
  } = useData();

  const [targetDate, setTargetDate] = useState(() => {
    // Default to tomorrow, but if it's before 18:00, could be today
    const now = new Date();
    if (now.getHours() < 18) {
      return todayStr(); // Early enough to produce for today
    }
    return addDays(todayStr(), 1);
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  // Run predictions
  const predictions = useMemo(() => {
    return predictAll(targetDate, salesRecords, inventoryBatches, holidays, skus, stores);
  }, [targetDate, salesRecords, inventoryBatches, holidays, skus, stores]);

  // Merge predictions with existing plans
  const mergedPlans = useMemo(() => {
    return predictions.map(p => {
      const existingPlan = productionPlans.find(
        plan => plan.date === p.date && plan.storeId === p.storeId && plan.skuId === p.skuId
      );
      return {
        prediction: p,
        plan: existingPlan || null,
        suggestedQuantity: existingPlan?.suggestedQuantity ?? p.suggestedProduction,
        actualQuantity: existingPlan?.actualQuantity ?? p.suggestedProduction,
        notes: existingPlan?.notes ?? '',
        confirmed: !!existingPlan?.confirmedAt,
      };
    });
  }, [predictions, productionPlans]);

  const startEdit = (item: typeof mergedPlans[0]) => {
    setEditingId(item.prediction.skuId + item.prediction.storeId);
    setEditQty(item.actualQuantity);
    setEditNotes(item.notes);
  };

  const saveEdit = (item: typeof mergedPlans[0]) => {
    const planId = `plan-${targetDate}-${item.prediction.storeId}-${item.prediction.skuId}`;

    const plan: Omit<ProductionPlan, 'id'> = {
      date: targetDate,
      storeId: item.prediction.storeId,
      skuId: item.prediction.skuId,
      suggestedQuantity: item.suggestedQuantity,
      actualQuantity: editQty,
      confirmedAt: item.confirmed ? item.plan?.confirmedAt || null : null,
      notes: editNotes,
    };
    addProductionPlan(plan);
    setEditingId(null);
  };

  const handleConfirm = (item: typeof mergedPlans[0]) => {
    const planId = `plan-${targetDate}-${item.prediction.storeId}-${item.prediction.skuId}`;
    confirmProductionPlan(planId, item.actualQuantity, item.notes);

    // Create inventory batch from confirmed plan
    const sku = skus.find(s => s.id === item.prediction.skuId);
    if (sku && item.actualQuantity > 0) {
      addInventoryBatch({
        skuId: item.prediction.skuId,
        storeId: item.prediction.storeId,
        productionDate: targetDate,
        quantity: item.actualQuantity,
        remainingQuantity: item.actualQuantity,
        shelfLife: sku.shelfLife,
        expiryDate: addDays(targetDate, sku.shelfLife),
      });
    }

    setSavedMessage(`✅ ${sku?.name} 已确认生产 ${item.actualQuantity} 个`);
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // Group by store
  const grouped = useMemo(() => {
    const map: Record<string, typeof mergedPlans> = {};
    for (const item of mergedPlans) {
      if (!map[item.prediction.storeId]) map[item.prediction.storeId] = [];
      map[item.prediction.storeId].push(item);
    }
    return map;
  }, [mergedPlans]);

  // Grand total
  const grandTotal = mergedPlans.reduce((s, item) => s + item.actualQuantity, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">生产日期</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-gray-500">总生产计划</div>
          <div className="text-2xl font-bold text-gray-900">{grandTotal} 个</div>
        </div>
      </div>

      {savedMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          {savedMessage}
        </div>
      )}

      {/* Per store plan tables */}
      {Object.entries(grouped).map(([storeId, items]) => {
        const store = stores.find(s => s.id === storeId);
        const storeTotal = items.reduce((s, i) => s + i.actualQuantity, 0);

        return (
          <div key={storeId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                🏪 {store?.name}
              </h3>
              <span className="text-xs text-gray-500">小计: {storeTotal} 个</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">保质期</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">当前库存</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">AI建议</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">实际生产</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">备注</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">状态</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const sku = skus.find(s => s.id === item.prediction.skuId);
                    const isEditing = editingId === item.prediction.skuId + item.prediction.storeId;
                    const prodDiff = item.actualQuantity - item.suggestedQuantity;

                    return (
                      <tr key={item.prediction.skuId} className={`border-b border-gray-50 ${
                        item.confirmed ? 'bg-green-50/30' : 'hover:bg-gray-50/50'
                      }`}>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{sku?.name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{sku?.shelfLife}天</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{item.prediction.availableStock}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-medium text-purple-600">{item.suggestedQuantity}</span>
                        </td>

                        {isEditing ? (
                          <>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                min="0"
                                value={editQty}
                                onChange={e => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 px-2 py-1 border border-blue-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="备注..."
                                className="w-32 px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs text-blue-600">编辑中</td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => saveEdit(item)}
                                  className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-bold ${
                                prodDiff !== 0 ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                                {item.actualQuantity}
                              </span>
                              {prodDiff !== 0 && (
                                <span className={`text-xs ml-1 ${
                                  prodDiff > 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  ({prodDiff > 0 ? '+' : ''}{prodDiff})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[120px] truncate">
                              {item.notes || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {item.confirmed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  <Check size={12} /> 已确认
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                  <Clock size={12} /> 待确认
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => startEdit(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="编辑"
                                >
                                  <Edit3 size={14} />
                                </button>
                                {!item.confirmed && (
                                  <button
                                    onClick={() => handleConfirm(item)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                                  >
                                    确认生产
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
