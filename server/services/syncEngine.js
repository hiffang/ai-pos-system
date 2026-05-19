/**
 * Sync Engine Service
 * Implements offline-first pattern with atomic database writes + outbox entries
 * All data modifications should use localWrite() to ensure sync consistency
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");

/**
 * @typedef {object} LocalWriteParams
 * @property {"INSERT"|"UPDATE"|"DELETE"} operation
 * @property {string} entity
 * @property {(tx: import("@prisma/client").PrismaClient) => Promise<any>} write
 * @property {(result: any) => object} [payload]
 * @property {(result: any) => string} [getEntityId]
 */

/**
 * @param {unknown} value
 */
function toJson(value) {
  return JSON.stringify(value);
}

/**
 * Atomically write data to database and create outbox entry for sync
 * @param {LocalWriteParams} params
 * @returns {Promise<any>} - Database result
 */
async function localWrite({ operation, entity, write, payload, getEntityId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const result = await write(tx);
      const entityId = getEntityId ? getEntityId(result) : result?.id;

      if (!entityId) {
        throw new Error(`Missing entityId for ${entity} ${operation}`);
      }

      const outboxPayload = payload ? payload(result) : result;

      await tx.outbox.create({
        data: {
          entity,
          entityId,
          operation,
          payload: toJson(outboxPayload),
          synced: false,
          retries: 0,
        },
      });

      console.log(
        `[localWrite] ${operation} ${entity} ${entityId} queued for sync`,
      );

      return result;
    });
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
