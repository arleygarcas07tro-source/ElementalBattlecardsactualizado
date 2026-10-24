'use strict';

const { AppError } = require('../../../core/errors');

function buildErrorHandler(logger) {
  return (error, req, res, _next) => {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    logger.error(error);
    return res.status(500).json({ message: 'Error en el servidor.' });
  };
}

module.exports = buildErrorHandler;