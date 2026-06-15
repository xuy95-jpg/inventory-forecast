'use client';

import { useMemo, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { todayStr } from '@/lib/helpers';
import { getAllStoresTotalStock, getRiskItems } from '@/lib/inventory';
import { addDays } from '@/lib/helpers';
import StatsCard from '@/components/dashboard/StatsCard';
import SalesChart from '@/components/dashboard/SalesChart';
import SkuRanking from '@/components/dashboard/SkuRanking';
import RiskAlert from '@/components/dashboard/RiskAlert';
import { Package, ShoppingCart, Calendar, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { stores, skus, salesRecords, inventoryBatches, productionPlans, predictionRecords } = useData();
  const riskRef = useRef<HTMLDivElement>(null);

  const latestDataDate = useMemo(() => {
    if (salesRecords.length === 0) return todayStr();
    const dates = [...new Set(salesRecords.filter(r => r.salesQuantity > 0).map(r => r.date))].sort();
    return dates.length > 0 ? dates[dates.length - 1] : todayStr();
  }, [salesRecords]);

  const todaySales = useMemo(() =>
    salesRecords.filter(r => r.date === latestDataDate).reduce((s, r) => s + r.salesQuantity, 0),
  [salesRecords, latestDataDate]);

  const skuCatMap = useMemo(() => new Map(skus.map(s => [s.id, s.category])), [skus]);
  const totalStock = useMemo(() => getAllStoresTotalStock(inventoryBatches, skuCatMap), [inventoryBatches, skuCatMap]);

  const riskItems = useMemo(() => {
    const skuMap = new Map(skus.map(s => [s.id, s.name]));
    const storeMap = new Map(stores.map(s => [s.id, s.name]));
    return getRiskItems(inventoryBatches, skuMap, storeMap);
  }, [inventoryBatches, skus, stores]);

  const todayPlans = useMemo(() =>
    productionPlans.filter(p => p.date === latestDataDate).reduce((s, p) => s + p.actualQuantity, 0),
  [productionPlans, latestDataDate]);

  const scrollToRisk = () => riskRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">武林路备货总览 · 最新数据: {latestDataDate}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="当前总库存" value={totalStock} subtitle="块（6寸等价）" icon={<Package size={20} />} color="blue" />
        <StatsCard title="最新日销量" value={todaySales} subtitle={latestDataDate} icon={<ShoppingCart size={20} />} color="green" />
        <StatsCard title="今日生产计划" value={todayPlans} subtitle={`${productionPlans.filter(p => p.confirmedAt).length} 个已确认`} icon={<Calendar size={20} />} color="purple" />
        <StatsCard title="风险库存" value={riskItems.length} subtitle={`${riskItems.reduce((s,r)=>s+r.remainingQuantity,0)} 块有风险`} icon={<AlertTriangle size={20} />} color={riskItems.length > 0 ? 'red' : 'green'} onClick={scrollToRisk} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><SalesChart salesRecords={salesRecords} skus={skus} /></div>
        <div><SkuRanking salesRecords={salesRecords} skus={skus} stores={stores} /></div>
      </div>

      <div ref={riskRef}><RiskAlert riskItems={riskItems} /></div>
    </div>
  );
}
