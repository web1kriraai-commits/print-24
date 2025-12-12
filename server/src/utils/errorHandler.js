/**
 * Utility function to handle MongoDB errors gracefully
 * Suppresses verbose stack traces for connection errors and provides cleaner error messages
 */
export const handleMongoError = (err, context = 'Database operation') => {
  // Check if it's a MongoDB connection error
  const isConnectionError = 
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoTimeoutError' ||
    err.message?.includes('ETIMEDOUT') ||
    err.message?.includes('ECONNREFUSED') ||
    err.message?.includes('connection') ||
    err.message?.includes('timed out') ||
    err.message?.includes('timeout');

  if (isConnectionError) {
    // Log connection errors with minimal verbosity
    console.warn(`⚠️ [${context}] MongoDB connection issue: ${err.message || err.name}`);
    return {
      isConnectionError: true,
      message: 'Database connection temporarily unavailable. Please try again.',
      statusCode: 503, // Service Unavailable
    };
  }

  // For other errors, log normally but don't show full stack in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    console.error(`❌ [${context}] Error:`, err);
  } else {
    console.error(`❌ [${context}] Error:`, err.message || err.name);
  }

  return {
    isConnectionError: false,
    message: err.message || 'An error occurred',
    statusCode: err.statusCode || 500,
  };
};

/**
 * Wrapper function for async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      const errorInfo = handleMongoError(err, `${req.method} ${req.path}`);
      return res.status(errorInfo.statusCode).json({
        success: false,
        error: errorInfo.message,
      });
    });
  };
};

