/**
 * Auth Routes
 *   POST /api/auth/login  — email + password → JWT
 *   GET  /api/auth/me     — current user (requires valid token)
 */
/** @type {import("express")} */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");

const TOKEN_TTL = "12h";

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

// POST /api/auth/login
router.post(
  "/login",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        throw createHttpError("Email and password are required", 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: String(email).trim().toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          passwordHash: true,
        },
      });

      // Generic message for both unknown email and bad password — don't leak
      // which side failed.
      if (!user) {
        throw createHttpError("Invalid email or password", 401);
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        throw createHttpError("Invalid email or password", 401);
      }

      if (!process.env.JWT_SECRET) {
        throw createHttpError("Server JWT_SECRET not configured", 500);
      }

      const token = jwt.sign(
        { sub: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_TTL },
      );

      res.json({
        status: "success",
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/auth/me — echo the authenticated user (used by client to rehydrate)
router.get(
  "/me",
  authenticate,
  async (
    /** @type {import("express").Request & { user?: any }} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) {
        throw createHttpError("User not found", 404);
      }
      res.json({ status: "success", data: user });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
