/**
 * Transactions Routes
 * Handles POS transaction operations
 */
const express = require("express");
const router = express.Router();
const prisma = require("../db");

// GET /api/transactions - List transactions
router.get("/", async (req, res, next) => {
  try {
    const { skip = 0, take = 50, startDate, endDate } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      },
      skip: parseInt(skip),
      take: parseInt(take),
      include: { items: true, payment: true },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.transaction.count();

    res.json({
      status: "success",
      data: transactions,
      pagination: { skip: parseInt(skip), take: parseInt(take), total },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/transactions/:id - Get single transaction
router.get("/:id", async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { items: true, payment: true, customer: true },
    });

    if (!transaction) {
      const error = new Error("Transaction not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      status: "success",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions - Create transaction
router.post("/", async (req, res, next) => {
  try {
    const { customerId, items, paymentMethod, total, discount } = req.body;

    if (!items || items.length === 0) {
      const error = new Error("Transaction must have items");
      error.statusCode = 400;
      throw error;
    }

    const transaction = await prisma.transaction.create({
      data: {
        customerId,
        total: parseFloat(total),
        discount: discount ? parseFloat(discount) : 0,
        paymentMethod,
        status: "completed",
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: parseFloat(item.price),
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({
      status: "success",
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
