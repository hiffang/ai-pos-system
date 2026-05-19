/**
 * Products Routes
 * Handles product inventory operations
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

/**
 * @param {string | undefined} searchValue
 * @param {string | undefined} categoryValue
 * @param {string | undefined} categoryIdValue
 */
function buildProductWhere(searchValue, categoryValue, categoryIdValue) {
  /** @type {Array<any>} */
  const filters = [];
  if (searchValue) {
    filters.push({
      OR: [
        { name: { contains: searchValue } },
        { sku: { contains: searchValue } },
      ],
    });
  }
  if (categoryIdValue) {
    filters.push({ categoryId: categoryIdValue });
  }
  if (categoryValue) {
    filters.push({ category: { name: categoryValue } });
  }

  return filters.length > 0 ? { AND: filters } : undefined;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value && "toNumber" in value) {
    // @ts-ignore - Decimal.js exposes toNumber.
    return value.toNumber();
  }
  return Number(value);
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
      const where = buildProductWhere(
        searchValue,
        categoryValue,
        categoryIdValue,
      );

      const products = await prisma.product.findMany({
        where,
        skip: parsedSkip,
        take: parsedTake,
        include: { category: true },
        orderBy: { name: "asc" },
      });

      res.json({
        status: "success",
        data: products,
        pagination: {
          skip: parsedSkip,
          take: parsedTake,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/products/summary - Inventory stats for current filters
router.get(
  "/summary",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { search, category, categoryId } = req.query;
      const searchValue = getQueryString(search);
      const categoryValue = getQueryString(category);
      const categoryIdValue = getQueryString(categoryId);
      const where = buildProductWhere(
        searchValue,
        categoryValue,
        categoryIdValue,
      );

      const products = await prisma.product.findMany({
        where,
        select: {
          stockQty: true,
          reorderThreshold: true,
          priceLKR: true,
          category: { select: { name: true } },
        },
      });

      const totalStockValue = products.reduce((sum, product) => {
        return sum + product.stockQty * toNumber(product.priceLKR);
      }, 0);

      const lowStockItems = products.filter(
        (product) => product.stockQty <= product.reorderThreshold,
      ).length;

      /** @type {Record<string, number>} */
      const categoryTotals = {};
      for (const product of products) {
        const categoryName = product.category?.name || "Uncategorized";
        categoryTotals[categoryName] =
          (categoryTotals[categoryName] || 0) +
          product.stockQty * toNumber(product.priceLKR);
      }

      const [topCategory, topCategoryValue] = Object.entries(
        categoryTotals,
      ).sort((a, b) => b[1] - a[1])[0] || [null, 0];

      res.json({
        status: "success",
        data: {
          totalProducts: products.length,
          totalStockValue,
          lowStockItems,
          topCategory,
          topCategoryValue,
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

      const product = await localWrite({
        operation: "INSERT",
        entity: "Product",
        write: (tx) =>
          tx.product.create({
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
          }),
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

      const product = await localWrite({
        operation: "UPDATE",
        entity: "Product",
        write: (tx) =>
          tx.product.update({
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
          }),
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

// DELETE /api/products/:id - Delete product
router.delete(
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

      await localWrite({
        operation: "DELETE",
        entity: "Product",
        write: (tx) => tx.product.delete({ where: { id: productId } }),
      });

      res.json({
        status: "success",
        message: "Product deleted",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
