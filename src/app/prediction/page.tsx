'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { predictSales } from '@/lib/prediction';
import { PredictionResult as PredictionResultType } from '@/types';
import PredictionForm from '@/components/prediction/PredictionForm';
import PredictionResult from '@/components/prediction/PredictionResult';
import HistoryChart from '@/components/prediction/HistoryChart';

export default function PredictionPage() {
  const { salesRecords, inventoryBatches, holidays, skus, getSkuById, getStoreById } = useData();

  const [result, setResult] = useState<PredictionResultType | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState('');

  const handlePredict = (date: string, storeId: string, skuId: string) => {
    setLoading(true);
    setSelectedDate(date);
    setSelectedStoreId(storeId);
    setSelectedSkuId(skuId);

    // Small delay for UX
    setTimeout(() => {
      const prediction = predictSales(
        date,
        storeId,
        skuId,
        salesRecords,
        inventoryBatches,
        holidays,
        skus
      );
      setResult(prediction);
      setLoading(false);
    }, 400);
  };

  const sku = selectedSkuId ? getSkuById(selectedSkuId) : undefined;
  const store = selectedStoreId ? getStoreById(selectedStoreId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI 销量预测</h1>
        <p className="text-sm text-gray-500 mt-1">基于历史数据的加权平均预测模型</p>
      </div>

      <PredictionForm onPredict={handlePredict} loading={loading} />

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mb-3" />
          <p className="text-sm text-gray-500">AI正在计算预测结果...</p>
        </div>
      )}

      {result && !loading && sku && store && (
        <>
          <PredictionResult result={result} sku={sku} store={store} />
          <HistoryChart
            salesRecords={salesRecords}
            storeId={result.storeId}
            skuId={result.skuId}
            predictionDate={result.date}
            predictedSales={result.predictedSales}
          />
        </>
      )}

      {!result && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">🔮</div>
          <p className="text-sm text-gray-500">选择预测参数后点击「开始预测」</p>
          <p className="text-xs text-gray-400 mt-1">
            预测模型：昨日×0.35 + 前日×0.20 + 近7日均×0.25 + 上周同期×0.20
          </p>
        </div>
      )}
    </div>
  );
}
