/**
 * Heuristic adapter — calendar-aware lag-average forecaster.
 *
 * Multiplies base demand (28-day rolling mean) by Sri Lankan calendar effects
 * for each future day in the horizon. No ONNX model required — used as the
 * fallback that lets the inference pipeline run end-to-end before a trained
 * model exists, and as the offline safety net if a model fails to load.
 */
const calendar = require("../../../../ai/calendar/sriLankaCalendar");
const contract = require("../predictionContract");

const FESTIVAL_DAY_MULTIPLIER = 1.6;
const FESTIVAL_WINDOW_MULTIPLIER = 1.25;
const SALARY_WINDOW_MULTIPLIER = 1.15;
const POYA_MULTIPLIER = 1.1;
const MONSOON_DAMPENER = 0.92;
const Z_P90 = 1.2815515655446004;

/** @param {number[]} arr */
function mean(arr) {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const x of arr) sum += x;
  return sum / arr.length;
}

/** @param {number[]} arr */
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let acc = 0;
  for (const x of arr) acc += (x - m) ** 2;
  return Math.sqrt(acc / (arr.length - 1));
}

/**
 * @param {{ isFestivalDay: number, isPoyaDay: number, inSinhalaTamilNewYearWindow: number, inEidAlFitrWindow: number, inDeepavaliWindow: number, inChristmasWindow: number, inSalaryWindow: number, inMonsoonYala: number, inMonsoonMaha: number }} f
 */
function dayMultiplier(f) {
  let m = 1.0;
  if (f.isFestivalDay) {
    m *= FESTIVAL_DAY_MULTIPLIER;
  } else if (
    f.inSinhalaTamilNewYearWindow ||
    f.inEidAlFitrWindow ||
    f.inDeepavaliWindow ||
    f.inChristmasWindow
  ) {
    m *= FESTIVAL_WINDOW_MULTIPLIER;
  }
  if (f.inSalaryWindow) m *= SALARY_WINDOW_MULTIPLIER;
  if (f.isPoyaDay) m *= POYA_MULTIPLIER;
  if (f.inMonsoonYala || f.inMonsoonMaha) m *= MONSOON_DAMPENER;
  return m;
}

const adapter = {
  modelType: "heuristic",

  /**
   * No assets to load — pure JS.
   * @returns {Promise<{}>}
   */
  async load() {
    return {};
  },

  /**
   * @param {{ id?: string, salesHistory?: number[] }} productData
   * @param {{ horizonDays: number, asOf?: Date, modelVersion: string }} options
   */
  predict(productData, options) {
    const history = Array.isArray(productData.salesHistory)
      ? productData.salesHistory
      : [];
    const horizon = options.horizonDays;
    const asOf = options.asOf || new Date();

    const recent = history.slice(-28);
    const dailyBase = mean(recent);
    const dailyStd = stddev(recent);

    let totalMultiplier = 0;
    for (let i = 1; i <= horizon; i++) {
      const future = new Date(asOf);
      future.setDate(future.getDate() + i);
      const features = calendar.getCalendarFeatures(future);
      totalMultiplier += dayMultiplier(features);
    }

    const point = dailyBase * totalMultiplier;
    const horizonStd = dailyStd * Math.sqrt(horizon);
    const lower = point - Z_P90 * horizonStd;
    const upper = point + Z_P90 * horizonStd;
    const baseline = dailyBase * horizon;
    const confidence = Math.min(0.9, 0.4 + recent.length / 56);

    return contract.build(
      { point, lower, upper, confidence, baseline },
      {
        productId: productData.id,
        horizonDays: horizon,
        modelVersion: options.modelVersion,
      },
    );
  },

  /** @returns {{ ready: boolean }} */
  status() {
    return { ready: true };
  },
};

module.exports = adapter;
