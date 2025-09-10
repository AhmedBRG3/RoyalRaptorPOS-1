function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  // Log the error for debugging
  console.error('Error occurred:', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    statusCode: statusCode,
    error: err.message,
    stack: err.stack,
    headers: req.headers
  });
  
  res.status(statusCode);
  res.json({
    message: err.message || 'Server Error',
    statusCode: statusCode,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };


