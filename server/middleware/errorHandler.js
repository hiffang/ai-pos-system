// Central error handling middleware for all Express routes
const errorHandler = (err, req, res, next) => {
  console.error("[Error]", err.message || err);

  // Prisma validation errors
  if (err.code === "P2002") {
    return res.status(409).json({
      status: "error",
      message: "Unique constraint violation",
      code: err.code,
    });
  }

  // Prisma not found errors
  if (err.code === "P2025") {
    return res.status(404).json({
      status: "error",
      message: "Resource not found",
      code: err.code,
    });
  }

  // Validation errors
  if (err.statusCode === 400) {
    return res.status(400).json({
      status: "error",
      message: err.message || "Validation failed",
    });
  }

  // Unauthorized errors
  if (err.statusCode === 401 || err.name === "UnauthorizedError") {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized",
    });
  }

  // Default 500 error
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler;
