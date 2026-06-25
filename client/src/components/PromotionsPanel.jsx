import { useState, useEffect, useCallback } from "react";
import {
  fetchOverstockRecommendations,
  fetchBasketRecommendations,
} from "../store/apiClient";

const TREND_ICONS = {
  increasing: "↑",
  stable: "→",
  decreasing: "↓",
};

/**
 * Suggest a starting discount % scaled to how overstocked the product is —
 * the manager can always edit this before saving.
 * @param {number} ratio
 */
function suggestedPercent(ratio) {
  if (ratio >= 8) return 25;
  if (ratio >= 4) return 15;
  return 10;
}

/**
 * @param {{
 *   reloadToken: number,
 *   onCreateDiscount: (input: { productId: string, productName: string, suggestedValue: number, suggestedReason: string }) => void,
 * }} props
 */
export default function PromotionsPanel({ reloadToken, onCreateDiscount }) {
  const [overstock, setOverstock] = useState([]);
  const [basket, setBasket] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overstockData, basketData] = await Promise.all([
        fetchOverstockRecommendations(),
        fetchBasketRecommendations(),
      ]);
      setOverstock(overstockData);
      setBasket(basketData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-400">
          Analyzing demand and order history…
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-400">
          Analyzing demand and order history…
        </div>
      </div>
    );
  }

  if (overstock.length === 0 && basket.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Overstock / demand-based recommendations */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">trending_down</span>
          <div>
            <h3 className="font-semibold text-gray-900">Promotion Recommendations</h3>
            <p className="text-xs text-gray-500">Overstocked, slow-moving products</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {overstock.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No overstock candidates right now.</p>
          ) : (
            overstock.map((entry) => (
              <div key={entry.productId} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{entry.productName}</p>
                  <p className="text-xs text-gray-500">
                    {entry.stockQty} in stock · ~{Math.round(entry.point)} units/7d forecast{" "}
                    <span className="ml-1">{TREND_ICONS[entry.trend] || ""}</span>
                    {" · "}
                    <span className="font-medium text-orange-600">{entry.overstockRatio}x overstocked</span>
                  </p>
                </div>
                <button
                  onClick={() =>
                    onCreateDiscount({
                      productId: entry.productId,
                      productName: entry.productName,
                      suggestedValue: suggestedPercent(entry.overstockRatio),
                      suggestedReason: "Overstock clearance",
                    })
                  }
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Create Discount
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Market basket — frequently bought together */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-600">shopping_basket</span>
          <div>
            <h3 className="font-semibold text-gray-900">Frequently Bought Together</h3>
            <p className="text-xs text-gray-500">Bundle candidates from order history</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {basket.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">
              Not enough order history yet to detect patterns.
            </p>
          ) : (
            basket.map((pair) => (
              <div key={`${pair.productA}-${pair.productB}`} className="px-5 py-3">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{pair.productAName}</span>
                  {" + "}
                  <span className="font-medium">{pair.productBName}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bought together {pair.pairCount} times · {Math.round(pair.confidenceAtoB * 100)}%
                  of {pair.productAName} orders also include {pair.productBName}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() =>
                      onCreateDiscount({
                        productId: pair.productA,
                        productName: pair.productAName,
                        suggestedValue: 10,
                        suggestedReason: `Bundle with ${pair.productBName}`,
                      })
                    }
                    className="px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    Discount {pair.productAName}
                  </button>
                  <button
                    onClick={() =>
                      onCreateDiscount({
                        productId: pair.productB,
                        productName: pair.productBName,
                        suggestedValue: 10,
                        suggestedReason: `Bundle with ${pair.productAName}`,
                      })
                    }
                    className="px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    Discount {pair.productBName}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
