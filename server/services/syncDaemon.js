/**
 * Sync Daemon Service
 * Watches for pending outbox entries and syncs to Supabase when online.
 * Handles conflict resolution and retry logic.
 *
 * Connectivity detection uses a lightweight HTTP probe against a reliable
 * endpoint rather than the browser `window` object, which is not available
 * in the Node.js / Electron main process where this daemon runs.
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const supabase =
  /** @type {import("@supabase/supabase-js").SupabaseClient | null} */ (
    /** @type {unknown} */ (require("../utils/supabaseClient"))
  );

/** @type {NodeJS.Timeout | null} */
let syncInterval = null;
/** @type {NodeJS.Timeout | null} */
let connectivityInterval = null;
let isOnline = false; // start pessimistic; first probe sets the real state

// ---------------------------------------------------------------------------
// Connectivity probe
// ---------------------------------------------------------------------------

/**
 * Probe a lightweight, reliable URL to check real internet reachability.
 * Uses the Supabase URL when configured (same host we sync to), otherwise
 * falls back to the Anthropic API host — both are already allowed in the
 * network policy and give a fast non-caching HEAD response.
 *
 * @returns {Promise<boolean>}
 */
async function probeConnectivity() {
  const probeUrl =
    process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL}/health`
      : "https://api.anthropic.com";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(probeUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500; // 4xx still means we're online
  } catch {
    return false;
  }
}

/**
 * Update `isOnline` from a fresh probe and log transitions.
 */
async function refreshConnectivityState() {
  const wasOnline = isOnline;
  isOnline = await probeConnectivity();

  if (!wasOnline && isOnline) {
    console.log("[Sync] Online — triggering immediate sync");
    syncPendingOutbox().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[Sync] Post-reconnect sync error:", message);
    });
  } else if (wasOnline && !isOnline) {
    console.log("[Sync] Offline — outbox sync paused");
  }
}

// ---------------------------------------------------------------------------
// Daemon lifecycle
// ---------------------------------------------------------------------------

/**
 * Start the sync daemon.
 * Runs a connectivity probe every 20 s and an outbox flush every 30 s.
 */
function startSyncDaemon() {
  if (syncInterval) {
    console.log("[Sync] Daemon already running");
    return;
  }

  console.log("[Sync] Starting sync daemon");

  // Connectivity poller — every 20 s
  refreshConnectivityState(); // immediate first probe
  connectivityInterval = setInterval(refreshConnectivityState, 20_000);

  // Outbox flush — every 30 s, only when online
  syncInterval = setInterval(() => {
    if (isOnline) {
      syncPendingOutbox().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Sync] Daemon error:", message);
      });
    }
  }, 30_000);
}

/**
 * Stop the sync daemon and connectivity poller.
 */
function stopSyncDaemon() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (connectivityInterval) {
    clearInterval(connectivityInterval);
    connectivityInterval = null;
  }
  console.log("[Sync] Daemon stopped");
}

/**
 * Sync all pending outbox entries to Supabase
 * @returns {Promise<object>} - Sync result
 */
async function syncPendingOutbox() {
  try {
    // Get pending entries
    const pending = await prisma.outbox.findMany({
      where: {
        synced: false,
        retries: { lt: 5 }, // Max 5 retries
      },
      orderBy: { createdAt: "asc" },
      take: 100, // Batch process
    });

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    console.log(`[Sync] Processing ${pending.length} pending entries`);

    let synced = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        await syncEntry(entry);
        synced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Sync] Failed to sync ${entry.id}:`, message);
        failed++;

        // Increment retry count
        await prisma.outbox.update({
          where: { id: entry.id },
          data: { retries: { increment: 1 } },
        });
      }
    }

    console.log(`[Sync] Completed: ${synced} synced, ${failed} failed`);

    return { synced, failed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Sync] Outbox query failed:", message);
    throw error;
  }
}

/**
 * Sync a single outbox entry to Supabase
 * @param {object} entry - Outbox entry
 */
/**
 * @param {{ id: string, entity: string, entityId: string, operation: string, payload: string }} entry
 */
async function syncEntry(entry) {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const { entity, entityId, operation } = entry;
  let payload;
  try {
    payload = entry.payload ? JSON.parse(entry.payload) : {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid outbox payload JSON for ${entry.id}: ${message}`);
  }

  // Map operation to Supabase table
  const table = getSupabaseTable(entity);

  if (!table) {
    throw new Error(`Unknown entity type: ${entity}`);
  }

  try {
    if (operation === "INSERT") {
      await supabase.from(table).insert({
        id: entityId,
        ...payload,
        _local_synced_at: new Date().toISOString(),
      });
    } else if (operation === "UPDATE") {
      await supabase
        .from(table)
        .update({
          ...payload,
          _local_synced_at: new Date().toISOString(),
        })
        .eq("id", entityId);
    } else if (operation === "DELETE") {
      await supabase.from(table).delete().eq("id", entityId);
    }

    // Mark as synced
    await prisma.outbox.update({
      where: { id: entry.id },
      data: { synced: true },
    });

    console.log(`[Sync] ✓ ${entity} ${operation} synced`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Sync] ✗ ${entity} ${operation} failed:`, message);
    throw error;
  }
}

/**
 * Map entity type to Supabase table name
 * @param {string} entity - Entity type
 * @returns {string} - Table name
 */
function getSupabaseTable(entity) {
  /** @type {Record<string, string>} */
  const tableMap = {
    Order: "orders",
    OrderItem: "order_items",
    Payment: "payments",
    Product: "products",
    Category: "categories",
    User: "users",
    InventoryLog: "inventory_logs",
  };

  return tableMap[entity];
}

/**
 * Get sync daemon status
 * @returns {object} - Status info
 */
function getSyncStatus() {
  return {
    running: syncInterval !== null,
    online: isOnline,
    supabaseConnected: !!supabase,
  };
}

module.exports = {
  startSyncDaemon,
  stopSyncDaemon,
  syncPendingOutbox,
  getSyncStatus,
};
