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
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
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

      // Check for duplicate
      const existing = await prisma.category.findFirst({
        where: { name: { mode: "insensitive", equals: name } },
      });

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

      const category = await localWrite({
        operation: "UPDATE",
        entity: "Category",
        write: (tx) =>
          tx.category.update({
            where: { id: req.params.id },
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
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      await localWrite({
        operation: "DELETE",
        entity: "Category",
        write: async (tx) => {
          const count = await tx.product.count({
            where: { categoryId: req.params.id },
          });

          if (count > 0) {
            throw createHttpError(
              `Cannot delete category with ${count} product(s)`,
              400,
            );
          }

          return tx.category.delete({
            where: { id: req.params.id },
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
