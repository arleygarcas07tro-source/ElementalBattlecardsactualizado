'use strict';

function assertContract(implementation, methods, owner) {
  if (!implementation) {
    throw new TypeError(`[${owner}] Falta la dependencia.`);
  }
  const missing = methods.filter((method) => typeof implementation[method] !== 'function');
  if (missing.length > 0) {
    throw new TypeError(`[${owner}] La dependencia no implementa: ${missing.join(', ')}.`);
  }
}

module.exports = assertContract;