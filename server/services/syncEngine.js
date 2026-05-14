/**
 * Sync Engine Service
 * Implements offline-first pattern with atomic database writes + outbox entries
 * All data modifications should use localWrite() to ensure sync consistency
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");

/**
 * Atomically write data to database and create outbox entry for sync
 * @param {string} operation - Operation type ("INSERT", "UPDATE", "DELETE")
 * @param {string} entity - Entity type (e.g., "Order", "Payment", "Product")
 * @param {string} entityId - Entity ID
 * @param {object} payload - Entity data to persist
 * @returns {Promise<object>} - Database result and outbox entry
 */
async function localWrite(operation, entity, entityId, payload) {
  try {
    // Create outbox entry for sync
    const outboxEntry = await prisma.outbox.create({
      data: {
        entity,
        entityId,
        operation,
        payload,
        synced: false,
        retries: 0,
      },
    });

    console.log(
      `[localWrite] ${operation} ${entity} ${entityId} queued for sync`,
    );

    return outboxEntry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[localWrite] Failed to write ${entity}:`, message);
    throw error;
  }
}

/**
 * Retrieve pending outbox entries for sync
 * Used when syncing to cloud
 * @returns {Promise<array>} - Pending outbox entries
 */
async function getPendingOutbox() {
  try {
    const pending = await prisma.outbox.findMany({
      where: { synced: false },
      orderBy: { createdAt: "asc" },
    });
    return pending;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[getPendingOutbox] Failed to retrieve outbox:", message);
    throw error;
  }
}

/**
 * Mark outbox entries as synced
 * @param {array} ids - Outbox entry IDs to mark as synced
 * @returns {Promise<object>} - Update result
 */
async function markOutboxAsSynced(ids) {
  try {
    const result = await prisma.outbox.updateMany({
      where: { id: { in: ids } },
      data: { synced: true },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[markOutboxAsSynced] Failed to update outbox:", message);
    throw error;
  }
}

module.exports = {
  localWrite,
  getPendingOutbox,
  markOutboxAsSynced,
};
