/**
 * Categories Routes
 * Handles product category management
 */
const express = require("express");
const router = express.Router();
const prisma = require("../db");

// GET /api/categories - List all categories
router.get("/", async (req, res, next) => {
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
});

// GET /api/categories/:id - Get single category
router.get("/:id", async (req, res, next) => {
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
      const error = new Error("Category not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      status: "success",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories - Create category
router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      const error = new Error("Category name is required");
      error.statusCode = 400;
      throw error;
    }

    // Check for duplicate
    const existing = await prisma.category.findFirst({
      where: { name: { mode: "insensitive", equals: name } },
    });

    if (existing) {
      const error = new Error("Category already exists");
      error.statusCode = 409;
      throw error;
    }

    const category = await prisma.category.create({
      data: { name },
    });

    res.status(201).json({
      status: "success",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/categories/:id - Update category
router.put("/:id", async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      const error = new Error("Category name is required");
      error.statusCode = 400;
      throw error;
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name },
    });

    res.json({
      status: "success",
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id - Delete category
router.delete("/:id", async (req, res, next) => {
  try {
    // Check if category has products
    const count = await prisma.product.count({
      where: { categoryId: req.params.id },
    });

    if (count > 0) {
      const error = new Error(
        `Cannot delete category with ${count} product(s)`,
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({
      status: "success",
      message: "Category deleted",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
