'use client';

import { SalesRecord, Sku, Store } from '@/types';
import { todayStr } from '@/lib/helpers';

interface Props {
  salesRecords: SalesRecord[];
  skus: Sku[];
  stores: Store[];
}

export default function SkuRanking({ salesRecords, skus, stores }: Props) {
  const today = todayStr();
  const todayRecords = salesRecords.filter(r => r.date === today);

  // 按SKU聚合今日销量
  const skuRanking = skus
    .map(sku => {
      const total = todayRecords
        .filter(r => r.skuId === sku.id)
        .reduce((sum, r) => sum + r.salesQuantity, 0);
      return { sku, total };
    })
    .sort((a, b) => b.total - a.total);

  const maxSales = skuRanking[0]?.total || 1;

  // 按门店聚合今日销量
  const storeRanking = stores
    .map(store => {
      const total = todayRecords
        .filter(r => r.storeId === store.id)
        .reduce((sum, r) => sum + r.salesQuantity, 0);
      return { store, total };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">🏆 SKU销量排行（今日）</h3>
      <div className="space-y-3">
        {skuRanking.map(({ sku, total }, idx) => (
          <div key={sku.id} className="flex items-center gap-3">
            <span className={`text-xs font-bold w-5 ${
              idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-400' : 'text-gray-300'
            }`}>
              #{idx + 1}
            </span>
            <span className="text-sm text-gray-700 flex-1">{sku.name}</span>
            <div className="flex-1 max-w-[120px]">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(total / maxSales) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-900 w-8 text-right">{total}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 mb-3">门店销量分布</h4>
        <div className="space-y-2">
          {storeRanking.map(({ store, total }) => (
            <div key={store.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{store.name}</span>
              <span className="text-sm font-medium text-gray-900">{total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
