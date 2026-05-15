/**
 * Customer Credit Routes
 * Handles customer credit account management
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { localWrite } = require("../services/syncEngine");

/**
 * @param {string} message
 * @param {number} statusCode
 */
function createHttpError(message, statusCode) {
  const error = /** @type {Error & { statusCode?: number }} */ (
    new Error(message)
  );
  error.statusCode = statusCode;
  return error;
}

/**
 * @param {string | import("qs").ParsedQs | (string | import("qs").ParsedQs)[] | undefined} value
 * @returns {string | undefined}
 */
function getQueryString(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * @param {string | string[] | undefined} value
 */
function getParamString(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

// GET /api/customer-credits - List customer credit accounts
router.get(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { search } = req.query;
      const searchValue = getQueryString(search);

      const where = searchValue
        ? {
            OR: [
              { customerName: { contains: searchValue, mode: "insensitive" } },
              { phone: { contains: searchValue, mode: "insensitive" } },
            ],
          }
        : undefined;

      const credits = await prisma.customerCredit.findMany({
        where,
        orderBy: { updatedAt: "desc" },
      });

      res.json({
        status: "success",
        data: credits,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/customer-credits/:id - Get single credit account
router.get(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const creditId = getParamString(req.params.id);
      if (!creditId) {
        throw createHttpError("Customer credit ID is required", 400);
      }

      const credit = await prisma.customerCredit.findUnique({
        where: { id: creditId },
      });

      if (!credit) {
        throw createHttpError("Customer credit not found", 404);
      }

      res.json({
        status: "success",
        data: credit,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/customer-credits - Create credit account
router.post(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { customerName, phone, balanceLKR } = req.body;

      if (!customerName || !phone) {
        throw createHttpError("Customer name and phone are required", 400);
      }

      const credit = await localWrite({
        operation: "INSERT",
        entity: "CustomerCredit",
        write: (tx) =>
          tx.customerCredit.create({
            data: {
              customerName,
              phone,
              balanceLKR:
                balanceLKR !== undefined && balanceLKR !== null
                  ? parseFloat(balanceLKR)
                  : 0,
            },
          }),
      });

      res.status(201).json({
        status: "success",
        data: credit,
      });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/customer-credits/:id - Update credit account
router.put(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const creditId = getParamString(req.params.id);
      if (!creditId) {
        throw createHttpError("Customer credit ID is required", 400);
      }

      const { customerName, phone, balanceLKR } = req.body;

      if (!customerName && !phone && balanceLKR === undefined) {
        throw createHttpError("No fields provided to update", 400);
      }

      const credit = await localWrite({
        operation: "UPDATE",
        entity: "CustomerCredit",
        write: (tx) =>
          tx.customerCredit.update({
            where: { id: creditId },
            data: {
              ...(customerName && { customerName }),
              ...(phone && { phone }),
              ...(balanceLKR !== undefined &&
                balanceLKR !== null && {
                  balanceLKR: parseFloat(balanceLKR),
                }),
            },
          }),
      });

      res.json({
        status: "success",
        data: credit,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/customer-credits/:id/adjust - Adjust balance
router.post(
  "/:id/adjust",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const creditId = getParamString(req.params.id);
      if (!creditId) {
        throw createHttpError("Customer credit ID is required", 400);
      }

      const { amount } = req.body;
      if (amount === undefined || amount === null) {
        throw createHttpError("Adjustment amount is required", 400);
      }

      const parsedAmount =
        typeof amount === "string" ? parseFloat(amount) : amount;

      if (!parsedAmount || Number.isNaN(parsedAmount)) {
        throw createHttpError("Adjustment amount must be a number", 400);
      }

      const credit = await localWrite({
        operation: "UPDATE",
        entity: "CustomerCredit",
        write: (tx) =>
          tx.customerCredit.update({
            where: { id: creditId },
            data: { balanceLKR: { increment: parsedAmount } },
          }),
      });

      res.json({
        status: "success",
        data: credit,
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/customer-credits/:id - Delete credit account
router.delete(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const creditId = getParamString(req.params.id);
      if (!creditId) {
        throw createHttpError("Customer credit ID is required", 400);
      }

      await localWrite({
        operation: "DELETE",
        entity: "CustomerCredit",
        write: (tx) => tx.customerCredit.delete({ where: { id: creditId } }),
      });

      res.json({
        status: "success",
        message: "Customer credit deleted",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
