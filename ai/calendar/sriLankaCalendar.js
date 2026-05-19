/**
 * Sri Lankan calendar features for demand forecasting inference.
 * Must produce the same feature vector as ai/calendar/sriLankaCalendar.py
 * so training and inference stay aligned.
 */
const fs = require("fs");
const path = require("path");

/** @type {any} */
const events = JSON.parse(
  fs.readFileSync(path.join(__dirname, "events.json"), "utf8"),
);

const FEATURE_NAMES = Object.freeze([
  "dayOfWeek",
  "dayOfMonth",
  "month",
  "isPublicHoliday",
  "isPoyaDay",
  "isFestivalDay",
  "daysToNextFestival",
  "daysSinceLastFestival",
  "inSinhalaTamilNewYearWindow",
  "inEidAlFitrWindow",
  "inDeepavaliWindow",
  "inChristmasWindow",
  "inSalaryWindow",
  "inMonsoonYala",
  "inMonsoonMaha",
]);

/** @param {Date} d */
function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {string} s */
function parseIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {Date} a
 * @param {Date} b
 * @returns {number} whole days from a to b (b - a)
 */
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** @param {Date} d */
function isPoyaDay(d) {
  const list = events.poyaDays?.[String(d.getFullYear())] || [];
  return Array.isArray(list) && list.includes(toIsoDate(d));
}

/** @param {Date} d */
function isFixedHoliday(d) {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return (events.fixedPublicHolidays || []).some(
    (/** @type {{month:number, day:number}} */ h) =>
      h.month === month && h.day === day,
  );
}

/** @param {Date} d */
function isSinhalaTamilNewYear(d) {
  const cfg = events.sinhalaTamilNewYear;
  return d.getMonth() + 1 === cfg.month && cfg.days.includes(d.getDate());
}

/** @param {number} year */
function getEidAlFitr(year) {
  const entry = events.islamicFestivals?.eidAlFitr?.[String(year)];
  return entry?.date ? parseIso(entry.date) : null;
}

/** @param {number} year */
function getEidAlFitrPreWindow(year) {
  const entry = events.islamicFestivals?.eidAlFitr?.[String(year)];
  return entry?.preWindowDays ?? 14;
}

/** @param {number} year */
function getEidAlAdha(year) {
  const iso = events.islamicFestivals?.eidAlAdha?.[String(year)];
  return typeof iso === "string" ? parseIso(iso) : null;
}

/** @param {number} year */
function getDeepavali(year) {
  const iso = events.deepavali?.[String(year)];
  return typeof iso === "string" ? parseIso(iso) : null;
}

/** @param {number} year */
function getChristmas(year) {
  return new Date(year, 11, 25);
}

/** @param {number} year */
function getSinhalaTamilNYStart(year) {
  const cfg = events.sinhalaTamilNewYear;
  return new Date(year, cfg.month - 1, cfg.days[0]);
}

/** @param {number} year */
function majorFestivalDates(year) {
  const dates = [getSinhalaTamilNYStart(year), getChristmas(year)];
  const eidF = getEidAlFitr(year);
  if (eidF) dates.push(eidF);
  const eidA = getEidAlAdha(year);
  if (eidA) dates.push(eidA);
  const dpv = getDeepavali(year);
  if (dpv) dates.push(dpv);
  return dates;
}

/**
 * @param {Date} d
 * @param {Date | null} festival
 * @param {number} preDays
 * @param {number} postDays
 */
function inWindow(d, festival, preDays, postDays) {
  if (!festival) return false;
  const diff = daysBetween(festival, d);
  return diff >= -preDays && diff <= postDays;
}

/** @param {Date} d */
function isPublicHoliday(d) {
  const year = d.getFullYear();
  if (isFixedHoliday(d)) return true;
  if (isSinhalaTamilNewYear(d)) return true;
  if (isPoyaDay(d)) return true;
  const eidF = getEidAlFitr(year);
  if (eidF && daysBetween(eidF, d) === 0) return true;
  const eidA = getEidAlAdha(year);
  if (eidA && daysBetween(eidA, d) === 0) return true;
  const dpv = getDeepavali(year);
  if (dpv && daysBetween(dpv, d) === 0) return true;
  return false;
}

/** @param {Date} d */
function inMonsoonYala(d) {
  const m = d.getMonth() + 1;
  const cfg = events.monsoonSeasons.yala;
  return m >= cfg.startMonth && m <= cfg.endMonth;
}

/** @param {Date} d */
function inMonsoonMaha(d) {
  const m = d.getMonth() + 1;
  const cfg = events.monsoonSeasons.maha;
  return m >= cfg.startMonth || m <= cfg.endMonth;
}

/** @param {Date} d */
function inSalaryWindow(d) {
  const day = d.getDate();
  const cfg = events.salaryWindow;
  return day >= cfg.startDay || day <= cfg.endDay;
}

/** @param {Date} d */
function daysToNearestFestival(d) {
  const year = d.getFullYear();
  const all = [
    ...majorFestivalDates(year - 1),
    ...majorFestivalDates(year),
    ...majorFestivalDates(year + 1),
  ];
  let next = 999;
  let prev = 999;
  for (const f of all) {
    const diff = daysBetween(d, f);
    if (diff >= 0 && diff < next) next = diff;
    if (diff < 0 && -diff < prev) prev = -diff;
  }
  return { daysToNextFestival: next, daysSinceLastFestival: prev };
}

/**
 * Build the calendar feature dictionary for a given date.
 * @param {Date | string} date
 */
function getCalendarFeatures(date) {
  const d = date instanceof Date ? new Date(date.getTime()) : parseIso(date);
  d.setHours(0, 0, 0, 0);

  const year = d.getFullYear();
  const stny = getSinhalaTamilNYStart(year);
  const eidF = getEidAlFitr(year);
  const dpv = getDeepavali(year);
  const xmas = getChristmas(year);

  const isFestivalDay =
    isSinhalaTamilNewYear(d) ||
    (eidF && daysBetween(eidF, d) === 0) ||
    (dpv && daysBetween(dpv, d) === 0) ||
    daysBetween(xmas, d) === 0;

  const { daysToNextFestival, daysSinceLastFestival } =
    daysToNearestFestival(d);

  return {
    dayOfWeek: d.getDay(),
    dayOfMonth: d.getDate(),
    month: d.getMonth() + 1,
    isPublicHoliday: isPublicHoliday(d) ? 1 : 0,
    isPoyaDay: isPoyaDay(d) ? 1 : 0,
    isFestivalDay: isFestivalDay ? 1 : 0,
    daysToNextFestival,
    daysSinceLastFestival,
    inSinhalaTamilNewYearWindow: inWindow(
      d,
      stny,
      events.sinhalaTamilNewYear.preWindowDays,
      2,
    )
      ? 1
      : 0,
    inEidAlFitrWindow: inWindow(d, eidF, getEidAlFitrPreWindow(year), 2)
      ? 1
      : 0,
    inDeepavaliWindow: inWindow(d, dpv, 14, 2) ? 1 : 0,
    inChristmasWindow: inWindow(d, xmas, events.christmas.preWindowDays, 1)
      ? 1
      : 0,
    inSalaryWindow: inSalaryWindow(d) ? 1 : 0,
    inMonsoonYala: inMonsoonYala(d) ? 1 : 0,
    inMonsoonMaha: inMonsoonMaha(d) ? 1 : 0,
  };
}

/**
 * Build the calendar feature vector in FEATURE_NAMES order.
 * @param {Date | string} date
 */
function getFeatureVector(date) {
  const features = getCalendarFeatures(date);
  return FEATURE_NAMES.map(
    (name) => /** @type {any} */ (features)[name],
  );
}

module.exports = {
  getCalendarFeatures,
  getFeatureVector,
  getFeatureNames: () => [...FEATURE_NAMES],
};
