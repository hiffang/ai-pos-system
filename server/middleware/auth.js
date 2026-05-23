/**
 * Authentication + role-based access middleware.
 *
 * The token payload is trusted for the lifetime of the JWT — role changes
 * take effect on the user's next login. If you need instant revocation,
 * add a per-request DB lookup or a token version field.
 */
const jwt = require("jsonwebtoken");

const ROLE_RANK = Object.freeze({
  CASHIER: 1,
  MANAGER: 2,
  ADMIN: 3,
});

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
 * Verify the Bearer token and attach { id, name, role } to req.user.
 * Used as global middleware; routes opt out via the public allow-list in
 * server/index.js.
 */
function authenticate(
  /** @type {import("express").Request & { user?: any }} */ req,
  /** @type {import("express").Response} */ _res,
  /** @type {import("express").NextFunction} */ next,
) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return next(createHttpError("Missing or malformed Authorization header", 401));
    }
    if (!process.env.JWT_SECRET) {
      return next(createHttpError("Server JWT_SECRET not configured", 500));
    }
    const payload = /** @type {any} */ (
      jwt.verify(token, process.env.JWT_SECRET)
    );
    if (!payload?.sub || !payload?.role) {
      return next(createHttpError("Invalid token payload", 401));
    }
    req.user = { id: payload.sub, name: payload.name, role: payload.role };
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    next(createHttpError(`Invalid token: ${message}`, 401));
  }
}

/**
 * Guard that a request's authenticated user has at least the given role.
 * Hierarchy: ADMIN > MANAGER > CASHIER.
 *
 * @param {"CASHIER"|"MANAGER"|"ADMIN"} minRole
 */
function requireRole(minRole) {
  const required = ROLE_RANK[minRole] || 0;
  return (
    /** @type {import("express").Request & { user?: any }} */ req,
    /** @type {import("express").Response} */ _res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    if (!req.user) {
      return next(createHttpError("Unauthorized", 401));
    }
    const userRank = ROLE_RANK[
      /** @type {keyof typeof ROLE_RANK} */ (req.user.role)
    ] || 0;
    if (userRank < required) {
      return next(
        createHttpError(
          `Forbidden — requires role ${minRole} or higher`,
          403,
        ),
      );
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  ROLE_RANK,
};
