'use client';

import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr } from '@/lib/helpers';
import { getAllStoresTotalStock, getRiskItems } from '@/lib/inventory';
import { predictAll } from '@/lib/prediction';
import { addDays } from '@/lib/helpers';
import StatsCard from '@/components/dashboard/StatsCard';
import SalesChart from '@/components/dashboard/SalesChart';
import SkuRanking from '@/components/dashboard/SkuRanking';
import RiskAlert from '@/components/dashboard/RiskAlert';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    stores, skus, salesRecords, inventoryBatches,
    holidays,
  } = useData();

  const today = todayStr();
  const tomorrow = addDays(today, 1);

  // Today's stats
  const todaySales = useMemo(() => {
    return salesRecords
      .filter(r => r.date === today)
      .reduce((sum, r) => sum + r.salesQuantity, 0);
  }, [salesRecords, today]);

  const totalStock = useMemo(() => {
    return getAllStoresTotalStock(inventoryBatches);
  }, [inventoryBatches]);

  // Tomorrow's predictions
  const tomorrowPredictions = useMemo(() => {
    return predictAll(tomorrow, salesRecords, inventoryBatches, holidays, skus, stores);
  }, [tomorrow, salesRecords, inventoryBatches, holidays, skus, stores]);

  const tomorrowProduction = useMemo(() => {
    return tomorrowPredictions.reduce((sum, p) => sum + p.suggestedProduction, 0);
  }, [tomorrowPredictions]);

  // Risk items
  const riskItems = useMemo(() => {
    const skuMap = new Map(skus.map(s => [s.id, s.name]));
    const storeMap = new Map(stores.map(s => [s.id, s.name]));
    return getRiskItems(inventoryBatches, skuMap, storeMap);
  }, [inventoryBatches, skus, stores]);

  const riskStockCount = riskItems.reduce((sum, r) => sum + r.remainingQuantity, 0);

  // Yesterday for trend
  const yesterday = addDays(today, -1);
  const yesterdaySales = useMemo(() => {
    return salesRecords
      .filter(r => r.date === yesterday)
      .reduce((sum, r) => sum + r.salesQuantity, 0);
  }, [salesRecords, yesterday]);

  const salesTrend = todaySales > yesterdaySales ? 'up' : todaySales < yesterdaySales ? 'down' : 'neutral';
  const trendPct = yesterdaySales > 0
    ? `${Math.abs(Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100))}%`
    : '-';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">门店备货总览 · {today}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="今日总库存"
          value={totalStock}
          subtitle="所有门店可售库存"
          icon={<Package size={20} />}
          color="blue"
        />
        <StatsCard
          title="今日总销量"
          value={todaySales}
          subtitle={today}
          icon={<ShoppingCart size={20} />}
          trend={salesTrend}
          trendValue={`较昨日 ${trendPct}`}
          color="green"
        />
        <StatsCard
          title="明日建议生产"
          value={tomorrowProduction}
          subtitle={`预测日期: ${tomorrow}`}
          icon={<TrendingUp size={20} />}
          color="purple"
        />
        <div
          onClick={() => document.getElementById('risk-detail')?.scrollIntoView({ behavior: 'smooth' })}
          className="cursor-pointer"
        >
          <StatsCard
            title="风险库存"
            value={riskItems.length}
            subtitle={`${riskStockCount} 块库存有风险`}
            icon={<AlertTriangle size={20} />}
            color={riskItems.length > 0 ? 'red' : 'green'}
          />
        </div>
      </div>

      {/* Charts + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart salesRecords={salesRecords} skus={skus} />
        </div>
        <div>
          <SkuRanking salesRecords={salesRecords} skus={skus} stores={stores} />
        </div>
      </div>

      {/* Risk Alerts */}
      <div id="risk-detail">
        <RiskAlert riskItems={riskItems} />
      </div>
    </div>
  );
}
