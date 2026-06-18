/**
 * Categories Routes
 * Handles product category management
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { localWrite } = require("../services/syncEngine");
const { requireRole } = require("../middleware/auth");

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

// GET /api/categories - List all categories
router.get(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      res.json({
        status: "success",
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/categories/:id - Get single category
router.get(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const id = /** @type {string} */ (req.params.id);
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          products: true,
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw createHttpError("Category not found", 404);
      }

      res.json({
        status: "success",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/categories - Create category
router.post(
  "/",
  requireRole("MANAGER"),
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { name } = req.body;

      if (!name) {
        throw createHttpError("Category name is required", 400);
      }

      // SQLite has no case-insensitive equals; collate at the SQL level via raw query.
      const existingRows = await prisma.$queryRaw`
        SELECT id FROM Category WHERE name = ${name} COLLATE NOCASE LIMIT 1
      `;
      const existing = Array.isArray(existingRows) && existingRows.length > 0
        ? existingRows[0]
        : null;

      if (existing) {
        throw createHttpError("Category already exists", 409);
      }

      const category = await localWrite({
        operation: "INSERT",
        entity: "Category",
        write: (tx) => tx.category.create({ data: { name } }),
      });

      res.status(201).json({
        status: "success",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/categories/:id - Update category
router.put(
  "/:id",
  requireRole("MANAGER"),
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { name } = req.body;

      if (!name) {
        throw createHttpError("Category name is required", 400);
      }

      const id = /** @type {string} */ (req.params.id);
      const category = await localWrite({
        operation: "UPDATE",
        entity: "Category",
        write: (tx) =>
          tx.category.update({
            where: { id },
            data: { name },
          }),
      });

      res.json({
        status: "success",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/categories/:id - Delete category
router.delete(
  "/:id",
  requireRole("MANAGER"),
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const id = /** @type {string} */ (req.params.id);
      await localWrite({
        operation: "DELETE",
        entity: "Category",
        write: async (tx) => {
          const count = await tx.product.count({
            where: { categoryId: id },
          });

          if (count > 0) {
            throw createHttpError(
              `Cannot delete category with ${count} product(s)`,
              400,
            );
          }

          return tx.category.delete({
            where: { id },
          });
        },
      });

      res.json({
        status: "success",
        message: "Category deleted",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
