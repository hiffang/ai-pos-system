/**
 * User Management Routes — ADMIN-only.
 * Mounted in server/index.js with authenticate + requireRole("ADMIN"),
 * so individual handlers don't repeat the guard.
 *
 * Safety invariants enforced here:
 *   - Cannot delete yourself (always have a way back in via your own session).
 *   - Cannot demote or delete the last remaining ADMIN (no lockout).
 *   - Email is unique (DB-enforced, surfaced as 409).
 *   - Passwords must be at least 8 characters.
 */
/** @type {import("express")} */
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");

const VALID_ROLES = new Set(["CASHIER", "MANAGER", "ADMIN"]);
const MIN_PASSWORD_LENGTH = 8;

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

async function countAdmins() {
  return prisma.user.count({ where: { role: "ADMIN" } });
}

/**
 * @param {string} value
 */
function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

/**
 * Translate Prisma's unique-constraint error (P2002 on email) into 409.
 * @param {unknown} error
 */
function isUniqueEmailViolation(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    /** @type {any} */ (error).code === "P2002"
  );
}

// GET /api/users
router.get(
  "/",
  async (
    /** @type {import("express").Request} */ _req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      res.json({ status: "success", data: users });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/users
router.post(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { name, email, role, password } = req.body || {};
      if (!name || !email || !role || !password) {
        throw createHttpError(
          "name, email, role, and password are required",
          400,
        );
      }
      if (!VALID_ROLES.has(role)) {
        throw createHttpError(
          `Invalid role. Must be one of: ${Array.from(VALID_ROLES).join(", ")}`,
          400,
        );
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw createHttpError(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          400,
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);
      try {
        const user = await prisma.user.create({
          data: {
            name,
            email: normalizeEmail(email),
            role,
            passwordHash,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });
        res.status(201).json({ status: "success", data: user });
      } catch (err) {
        if (isUniqueEmailViolation(err)) {
          throw createHttpError("A user with that email already exists", 409);
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/users/:id — update name / email / role
router.put(
  "/:id",
  async (
    /** @type {import("express").Request & { user?: any }} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body || {};

      const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });
      if (!target) {
        throw createHttpError("User not found", 404);
      }

      if (role !== undefined) {
        if (!VALID_ROLES.has(role)) {
          throw createHttpError(`Invalid role`, 400);
        }
        // Prevent demoting the last admin.
        if (target.role === "ADMIN" && role !== "ADMIN") {
          const adminCount = await countAdmins();
          if (adminCount <= 1) {
            throw createHttpError(
              "Cannot demote the last ADMIN user",
              409,
            );
          }
        }
        // Prevent changing your own role (avoids accidental self-lockout).
        if (req.user?.id === id && role !== target.role) {
          throw createHttpError(
            "You cannot change your own role",
            409,
          );
        }
      }

      /** @type {any} */
      const data = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = normalizeEmail(email);
      if (role !== undefined) data.role = role;

      try {
        const updated = await prisma.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });
        res.json({ status: "success", data: updated });
      } catch (err) {
        if (isUniqueEmailViolation(err)) {
          throw createHttpError("A user with that email already exists", 409);
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/users/:id/reset-password — admin forces a new password
router.post(
  "/:id/reset-password",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body || {};
      if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
        throw createHttpError(
          `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters`,
          400,
        );
      }

      const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) {
        throw createHttpError("User not found", 404);
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });
      res.json({ status: "success", data: { ok: true } });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/users/:id
router.delete(
  "/:id",
  async (
    /** @type {import("express").Request & { user?: any }} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        throw createHttpError("You cannot delete your own account", 409);
      }

      const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });
      if (!target) {
        throw createHttpError("User not found", 404);
      }

      if (target.role === "ADMIN") {
        const adminCount = await countAdmins();
        if (adminCount <= 1) {
          throw createHttpError("Cannot delete the last ADMIN user", 409);
        }
      }

      try {
        await prisma.user.delete({ where: { id } });
        res.json({ status: "success", data: { ok: true } });
      } catch (err) {
        // Foreign-key constraint: user has orders/audit logs etc.
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          /** @type {any} */ (err).code === "P2003"
        ) {
          throw createHttpError(
            "User has existing orders or audit logs and cannot be deleted. Deactivate instead.",
            409,
          );
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
