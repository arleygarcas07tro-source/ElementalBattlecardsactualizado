'use strict';

const assertContract = require('../../core/assertContract');
const { AuthenticationError } = require('../../core/errors');

/**
 * Middleware de autenticación por JWT. Verifica el encabezado
 * "Authorization: Bearer <token>" y expone el usuario en req.user.
 */
function createAuthMiddleware(tokenService) {
  assertContract(tokenService, ['verify'], 'ITokenService');

  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const [scheme, token] = header.split(' ');

      if (scheme !== 'Bearer' || !token) {
        throw new AuthenticationError('Token de autenticación requerido.');
      }

      const decoded = await tokenService.verify(token);
      if (!decoded || !decoded.user || !decoded.user.id) {
        throw new AuthenticationError('Token inválido.');
      }

      req.user = decoded.user;
      return next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return next(error);
      }
      return next(new AuthenticationError('Token inválido o expirado.'));
    }
  };
}

module.exports = createAuthMiddleware;
