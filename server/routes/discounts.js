/**
 * Discount Routes
 * Manager-only CRUD for product discounts. The effective (discounted) price
 * itself is computed and surfaced through the products routes — these
 * endpoints only manage the Discount records.
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const {
  toNumber,
  createDiscount,
  removeDiscount,
} = require("../services/discountService");

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

// GET /api/discounts - list all currently-active discounts with product info
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const discounts = await prisma.discount.findMany({
      where: { active: true, startDate: { lte: now } },
      include: { product: { select: { id: true, name: true, sku: true, priceLKR: true } } },
      orderBy: { createdAt: "desc" },
    });

    const data = discounts
      .filter((d) => !d.endDate || new Date(d.endDate) >= now)
      .map((d) => ({
        id: d.id,
        productId: d.productId,
        productName: d.product?.name,
        sku: d.product?.sku,
        priceLKR: toNumber(d.product?.priceLKR),
        type: d.type,
        value: toNumber(d.value),
        reason: d.reason,
        startDate: d.startDate,
        endDate: d.endDate,
      }));

    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
});

// POST /api/discounts - create a discount for a product (deactivates any prior one)
router.post("/", async (req, res, next) => {
  try {
    const { productId, type, value, reason, endDate } = req.body || {};
    const discount = await createDiscount({ productId, type, value, reason, endDate });
    res.status(201).json({ status: "success", data: discount });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/discounts/:id - deactivate a discount
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw createHttpError("Discount ID is required", 400);
    await removeDiscount(id);
    res.json({ status: "success", message: "Discount removed" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
