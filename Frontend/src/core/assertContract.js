/**
 * Validador fail-fast de contratos (mismo patrón que Backend/src/core/assertContract).
 * Responsabilidad: comprobar en composición que una implementación expone los
 * métodos exigidos por un contrato, sin acoplarse a implementaciones concretas.
 * @param {object} implementation
 * @param {string[]} methods
 * @param {string} owner Nombre del contrato/dependencia.
 */
export function assertContract(implementation, methods, owner) {
    if (!implementation) {
        throw new TypeError(`[${owner}] Falta la dependencia.`);
    }
    const missing = methods.filter((method) => typeof implementation[method] !== 'function');
    if (missing.length > 0) {
        throw new TypeError(`[${owner}] La dependencia no implementa: ${missing.join(', ')}.`);
    }
}