/**
 * Products Routes
 * Handles product inventory operations
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");

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
 * @param {string | import("qs").ParsedQs | (string | import("qs").ParsedQs)[] | undefined} value
 * @param {number} fallback
 */
function getQueryInt(value, fallback) {
  const raw = getQueryString(value);
  const parsed = raw ? parseInt(raw, 10) : fallback;
  return Number.isNaN(parsed) ? fallback : parsed;
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

// GET /api/products - List all products
router.get(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { skip, take, search, category, categoryId } = req.query;
      const parsedSkip = getQueryInt(skip, 0);
      const parsedTake = getQueryInt(take, 50);
      const searchValue = getQueryString(search);
      const categoryValue = getQueryString(category);
      const categoryIdValue = getQueryString(categoryId);

      /** @type {Array<any>} */
      const filters = [];
      const queryMode = /** @type {"insensitive"} */ ("insensitive");
      if (searchValue) {
        filters.push({
          OR: [
            { name: { contains: searchValue, mode: queryMode } },
            { sku: { contains: searchValue, mode: queryMode } },
          ],
        });
      }
      if (categoryIdValue) {
        filters.push({ categoryId: categoryIdValue });
      }
      if (categoryValue) {
        filters.push({
          category: { name: { equals: categoryValue, mode: queryMode } },
        });
      }

      const where = filters.length > 0 ? { AND: filters } : undefined;

      const products = await prisma.product.findMany({
        where,
        skip: parsedSkip,
        take: parsedTake,
        include: { category: true },
        orderBy: { name: "asc" },
      });

      const total = await prisma.product.count({ where });

      res.json({
        status: "success",
        data: products,
        pagination: {
          skip: parsedSkip,
          take: parsedTake,
          total,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/products/:id - Get single product
router.get(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const productId = getParamString(req.params.id);
      if (!productId) {
        throw createHttpError("Product ID is required", 400);
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });

      if (!product) {
        throw createHttpError("Product not found", 404);
      }

      res.json({
        status: "success",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/products - Create product
router.post(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const {
        name,
        sku,
        priceLKR,
        stockQty,
        reorderThreshold,
        categoryId,
        price,
        stock,
        quantity,
        threshold,
      } = req.body;

      const priceValue = priceLKR ?? price;
      const stockValue = stockQty ?? quantity ?? stock;
      const thresholdValue = reorderThreshold ?? threshold;

      if (!name || !sku || priceValue === undefined || priceValue === null) {
        throw createHttpError("Name, SKU, and price are required", 400);
      }

      if (!categoryId) {
        throw createHttpError("Category ID is required", 400);
      }

      const product = await prisma.product.create({
        data: {
          name,
          sku,
          priceLKR: parseFloat(priceValue),
          stockQty:
            stockValue !== undefined && stockValue !== null
              ? parseInt(stockValue, 10)
              : 0,
          ...(thresholdValue !== undefined &&
            thresholdValue !== null && {
              reorderThreshold: parseInt(thresholdValue, 10),
            }),
          categoryId,
        },
      });

      res.status(201).json({
        status: "success",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/products/:id - Update product
router.put(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const {
        name,
        priceLKR,
        stockQty,
        reorderThreshold,
        categoryId,
        price,
        stock,
        quantity,
        threshold,
      } = req.body;

      const priceValue = priceLKR ?? price;
      const stockValue = stockQty ?? quantity ?? stock;
      const thresholdValue = reorderThreshold ?? threshold;

      const productId = getParamString(req.params.id);
      if (!productId) {
        throw createHttpError("Product ID is required", 400);
      }

      const product = await prisma.product.update({
        where: { id: productId },
        data: {
          ...(name && { name }),
          ...(priceValue !== undefined &&
            priceValue !== null && { priceLKR: parseFloat(priceValue) }),
          ...(stockValue !== undefined &&
            stockValue !== null && { stockQty: parseInt(stockValue, 10) }),
          ...(thresholdValue !== undefined &&
            thresholdValue !== null && {
              reorderThreshold: parseInt(thresholdValue, 10),
            }),
          ...(categoryId && { categoryId }),
        },
      });

      res.json({
        status: "success",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
