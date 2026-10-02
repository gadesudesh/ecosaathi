// Centralized error handling middleware
// This must be the LAST middleware registered in server.js (after all routes)

const errorHandler = (err, req, res, next) => {
  // Log the error stack in development for debugging
  console.error(err.stack);

  // Send a clean JSON error response — never crash the server
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong",
  });
};

module.exports = errorHandler;
