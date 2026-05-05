/**
 * Products Routes
 * Handles product inventory operations
 */
const express = require("express");
const router = express.Router();
const prisma = require("../db");

// GET /api/products - List all products
router.get("/", async (req, res, next) => {
  try {
    const { skip = 0, take = 50, search, category, categoryId } = req.query;
    const parsedSkip = parseInt(skip, 10);
    const parsedTake = parseInt(take, 10);

    const filters = [];
    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (categoryId) {
      filters.push({ categoryId });
    }
    if (category) {
      filters.push({
        category: { name: { equals: category, mode: "insensitive" } },
      });
    }

    const where = filters.length > 0 ? { AND: filters } : undefined;

    const products = await prisma.product.findMany({
      where,
      skip: Number.isNaN(parsedSkip) ? 0 : parsedSkip,
      take: Number.isNaN(parsedTake) ? 50 : parsedTake,
      include: { category: true },
      orderBy: { name: "asc" },
    });

    const total = await prisma.product.count({ where });

    res.json({
      status: "success",
      data: products,
      pagination: {
        skip: Number.isNaN(parsedSkip) ? 0 : parsedSkip,
        take: Number.isNaN(parsedTake) ? 50 : parsedTake,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get single product
router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      status: "success",
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Create product
router.post("/", async (req, res, next) => {
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
      const error = new Error("Name, SKU, and price are required");
      error.statusCode = 400;
      throw error;
    }

    if (!categoryId) {
      const error = new Error("Category ID is required");
      error.statusCode = 400;
      throw error;
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
});

// PUT /api/products/:id - Update product
router.put("/:id", async (req, res, next) => {
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

    const product = await prisma.product.update({
      where: { id: req.params.id },
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
});

module.exports = router;
