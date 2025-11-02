// src/middleware/errorHandler.js

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database connection errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(500).send('Database connection failed');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).send(`Validation Error: ${err.message}`);
  }

  // Default error response
  res.status(500).send('Internal Server Error');
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req, res) => {
  res.status(404).send('Page not found');
};