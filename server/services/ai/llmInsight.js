/**
 * LLM Insight Service
 *
 * Converts structured demand forecast data into plain-English narratives
 * using the Claude API.  Results are cached in the AIInsight table so the
 * dashboard always has something to show — even when the device is offline.
 *
 * Cost-control strategy (three gates before an API call is made):
 *   1. Hash gate  — skip if the forecast numbers haven't changed since the
 *                   last generation (same data → same insight → no call).
 *   2. Age gate   — skip if the cached insight is younger than
 *                   AI_INSIGHT_MAX_AGE_HOURS (default 12 h).
 *   3. Online gate — skip entirely when no ANTHROPIC_API_KEY is configured
 *                    or when the device is known to be offline; return the
 *                    last cached insight instead.
 *
 * Typical cost: ~$0.0005 per generation (≈ 400 in + 150 out tokens on
 * claude-sonnet-4-6).  With a 12-hour staleness window a busy store makes
 * at most 2 API calls/day.
 */

const crypto = require("crypto");
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../../db");

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 300;

const MAX_AGE_HOURS = Number(process.env.AI_INSIGHT_MAX_AGE_HOURS ?? 12);

// ---------------------------------------------------------------------------
// Types (JSDoc only — no runtime overhead)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ForecastEntry
 * @property {string}  product
 * @property {string}  stock
 * @property {string}  demand
 * @property {string}  recommendation
 * @property {string}  color
 */

/**
 * @typedef {Object} InsightResult
 * @property {string}  narrative      Plain-English insight text
 * @property {boolean} fromCache      true when returned from SQLite, not API
 * @property {Date}    generatedAt    When the narrative was originally created
 */

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic hash of the forecast payload so we can detect whether the
 * underlying numbers have actually changed between dashboard loads.
 *
 * @param {ForecastEntry[]} forecasts
 * @returns {string} 8-char hex prefix (enough for change detection)
 */
function hashForecasts(forecasts) {
  const stable = forecasts
    .map((f) => `${f.product}|${f.demand}|${f.recommendation}|${f.stock}`)
    .join("::");
  return crypto.createHash("sha256").update(stable).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Cache read / write
// ---------------------------------------------------------------------------

/**
 * Return the most-recently-generated non-stale insight, or null if none.
 * @returns {Promise<import("@prisma/client").AIInsight | null>}
 */
async function getActiveInsight() {
  return prisma.aIInsight.findFirst({
    where: { stale: false },
    orderBy: { generatedAt: "desc" },
  });
}

/**
 * Mark all existing insights as stale, then save the new one.
 *
 * @param {string} narrative
 * @param {string} inputHash
 * @returns {Promise<import("@prisma/client").AIInsight>}
 */
async function saveInsight(narrative, inputHash) {
  return prisma.$transaction(async (tx) => {
    await tx.aIInsight.updateMany({
      where: { stale: false },
      data: { stale: true },
    });
    return tx.aIInsight.create({
      data: {
        narrative,
        modelUsed: MODEL,
        inputHash,
        stale: false,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Staleness check
// ---------------------------------------------------------------------------

/**
 * @param {import("@prisma/client").AIInsight} insight
 * @returns {boolean}
 */
function isStale(insight) {
  const ageMs = Date.now() - new Date(insight.generatedAt).getTime();
  const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000;
  return ageMs > maxAgeMs;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the Claude prompt from the top demand forecast rows.
 * Keeping it tight (≤ 400 tokens in) controls cost.
 *
 * @param {ForecastEntry[]} forecasts
 * @param {{ todayRevenue: number, ordersToday: number, lowStockItems: number }} summary
 * @returns {string}
 */
function buildPrompt(forecasts, summary) {
  const rows = forecasts
    .slice(0, 5)
    .map(
      (f, i) =>
        `${i + 1}. ${f.product}: stock=${f.stock}, demand trend=${f.demand}, recommendation=${f.recommendation}`,
    )
    .join("\n");

  return `You are an AI assistant for a Sri Lankan grocery shop manager.
Today's summary: ${summary.ordersToday} orders, LKR ${summary.todayRevenue.toFixed(2)} revenue, ${summary.lowStockItems} low-stock items.

Top product demand forecast for the next 7 days:
${rows}

Write 2-3 short, actionable bullet points a non-technical shop manager can act on today.
Rules:
- Each bullet must be under 20 words.
- Be specific — mention product names.
- Flag any reorder urgency plainly (e.g. "reorder today", "stock up before the weekend").
- Do not repeat the numbers verbatim; interpret them.
- Plain text only — no markdown, no headers.`;
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

/**
 * Call the Claude API and return the narrative string.
 * Throws on network error or non-2xx response so the caller can fall back
 * to the cache gracefully.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callClaudeApi(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set — cannot generate insight");
  }

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(`Claude API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error("Claude API returned an empty response");
  }

  return text.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get an insight narrative for the current forecast data.
 *
 * Always returns something — either a freshly generated insight or the last
 * cached one.  Returns null only if no insight has ever been generated and
 * the API call fails (e.g. first boot, offline).
 *
 * @param {ForecastEntry[]} forecasts
 * @param {{ todayRevenue: number, ordersToday: number, lowStockItems: number }} summary
 * @returns {Promise<InsightResult | null>}
 */
async function getInsight(forecasts, summary) {
  if (!forecasts || forecasts.length === 0) return null;

  const inputHash = hashForecasts(forecasts);
  const cached = await getActiveInsight();

  // Gate 1: same data as last time — return cache immediately, no age check
  if (cached && cached.inputHash === inputHash) {
    console.log("[LLMInsight] Data unchanged — returning cached insight");
    return {
      narrative: cached.narrative,
      fromCache: true,
      generatedAt: cached.generatedAt,
    };
  }

  // Gate 2: data has changed but insight is still young — return cache
  if (cached && !isStale(cached)) {
    console.log("[LLMInsight] Data changed but insight still fresh — returning cache");
    return {
      narrative: cached.narrative,
      fromCache: true,
      generatedAt: cached.generatedAt,
    };
  }

  // Gate 3: no API key configured — return cache or null
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[LLMInsight] ANTHROPIC_API_KEY not set — skipping generation");
    if (cached) {
      return {
        narrative: cached.narrative,
        fromCache: true,
        generatedAt: cached.generatedAt,
      };
    }
    return null;
  }

  // All gates passed — call the API
  try {
    console.log("[LLMInsight] Generating fresh insight via Claude API...");
    const prompt = buildPrompt(forecasts, summary);
    const narrative = await callClaudeApi(prompt);
    const saved = await saveInsight(narrative, inputHash);

    console.log("[LLMInsight] Insight generated and cached");
    return {
      narrative: saved.narrative,
      fromCache: false,
      generatedAt: saved.generatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[LLMInsight] API call failed — falling back to cache:", message);

    if (cached) {
      return {
        narrative: cached.narrative,
        fromCache: true,
        generatedAt: cached.generatedAt,
      };
    }

    return null;
  }
}

/**
 * Return whatever insight is currently in cache without attempting an API
 * call.  Used by routes that want a fast non-blocking read.
 *
 * @returns {Promise<InsightResult | null>}
 */
async function getCachedInsight() {
  const cached = await getActiveInsight();
  if (!cached) return null;
  return {
    narrative: cached.narrative,
    fromCache: true,
    generatedAt: cached.generatedAt,
  };
}

module.exports = { getInsight, getCachedInsight };
