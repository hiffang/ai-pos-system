/**
 * Sync Daemon Service
 * Watches for pending outbox entries and syncs to Supabase when online
 * Handles conflict resolution and retry logic
 */
const prisma = require("../db");
const supabase = require("../utils/supabaseClient");

let syncInterval = null;
let isOnline = true;

/**
 * Start the sync daemon
 * Runs every 30 seconds when online, checks for pending outbox entries
 */
function startSyncDaemon() {
  if (syncInterval) {
    console.log("[Sync] Daemon already running");
    return;
  }

  console.log("[Sync] Starting sync daemon");

  // Check connectivity
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      isOnline = true;
      console.log("[Sync] Online detected, starting sync");
      syncPendingOutbox();
    });

    window.addEventListener("offline", () => {
      isOnline = false;
      console.log("[Sync] Offline detected, pausing sync");
    });
  }

  // Sync every 30 seconds if online
  syncInterval = setInterval(() => {
    if (isOnline) {
      syncPendingOutbox().catch((err) => {
        console.error("[Sync] Daemon error:", err.message);
      });
    }
  }, 30000);

  // Initial sync attempt
  syncPendingOutbox().catch((err) => {
    console.warn("[Sync] Initial sync failed (non-blocking):", err.message);
  });
}

/**
 * Stop the sync daemon
 */
function stopSyncDaemon() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[Sync] Daemon stopped");
  }
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
        console.error(`[Sync] Failed to sync ${entry.id}:`, error.message);
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
    console.error("[Sync] Outbox query failed:", error);
    throw error;
  }
}

/**
 * Sync a single outbox entry to Supabase
 * @param {object} entry - Outbox entry
 */
async function syncEntry(entry) {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const { entity, entityId, operation, payload } = entry;

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
    console.error(`[Sync] ✗ ${entity} ${operation} failed:`, error.message);
    throw error;
  }
}

/**
 * Map entity type to Supabase table name
 * @param {string} entity - Entity type
 * @returns {string} - Table name
 */
function getSupabaseTable(entity) {
  const tableMap = {
    Order: "orders",
    OrderItem: "order_items",
    Payment: "payments",
    Product: "products",
    Category: "categories",
    User: "users",
    CustomerCredit: "customer_credit",
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
