const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  return res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  logger.error('Error de API', {
    statusCode,
    message: err.message,
    stack: err.stack,
    details: err.details
  });

  return res.status(statusCode).json({
    ok: false,
    message:
      statusCode >= 500
        ? 'Ocurrió un error interno. Intenta nuevamente en unos minutos.'
        : err.message,
    details: err.details || undefined
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
