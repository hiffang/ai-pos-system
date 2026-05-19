/**
 * Normalized prediction contract returned by every model adapter.
 * Downstream consumers (routes, UI, inventory logic) depend on this shape only —
 * swapping the underlying model never breaks them.
 *
 * @typedef {Object} Prediction
 * @property {string=} productId
 * @property {number} horizonDays
 * @property {number} point          Expected units sold over the horizon (P50)
 * @property {number} lower          P10 quantile (units)
 * @property {number} upper          P90 quantile (units)
 * @property {number} confidence     0-1
 * @property {"very_low"|"low"|"medium"|"high"|"very_high"} demandLevel
 * @property {"increasing"|"stable"|"decreasing"} trend
 * @property {string} modelVersion
 * @property {Date} generatedAt
 */

const DEMAND_THRESHOLDS = [
  { ceiling: 2, level: "very_low" },
  { ceiling: 5, level: "low" },
  { ceiling: 15, level: "medium" },
  { ceiling: 30, level: "high" },
];

/**
 * @param {number} point
 * @returns {"very_low"|"low"|"medium"|"high"|"very_high"}
 */
function categorizeDemand(point) {
  for (const t of DEMAND_THRESHOLDS) {
    if (point < t.ceiling)
      return /** @type {any} */ (t.level);
  }
  return "very_high";
}

/**
 * @param {number} forecastPoint
 * @param {number} historicalBaseline   units per same-length window
 * @returns {"increasing"|"stable"|"decreasing"}
 */
function categorizeTrend(forecastPoint, historicalBaseline) {
  if (historicalBaseline <= 0) return "stable";
  const ratio = forecastPoint / historicalBaseline;
  if (ratio > 1.1) return "increasing";
  if (ratio < 0.9) return "decreasing";
  return "stable";
}

/**
 * Wrap raw adapter output into the normalized contract.
 * Adapters should never construct Prediction objects directly — go through here
 * so the shape stays consistent.
 *
 * @param {{ point: number, lower: number, upper: number, confidence: number, baseline?: number }} raw
 * @param {{ productId?: string, horizonDays: number, modelVersion: string }} meta
 * @returns {Prediction}
 */
function build(raw, meta) {
  const point = Math.max(0, raw.point);
  const lower = Math.max(0, raw.lower);
  const upper = Math.max(point, raw.upper);
  return {
    productId: meta.productId,
    horizonDays: meta.horizonDays,
    point,
    lower,
    upper,
    confidence: Math.min(1, Math.max(0, raw.confidence)),
    demandLevel: categorizeDemand(point),
    trend: categorizeTrend(point, raw.baseline ?? point),
    modelVersion: meta.modelVersion,
    generatedAt: new Date(),
  };
}

module.exports = {
  build,
  categorizeDemand,
  categorizeTrend,
};
