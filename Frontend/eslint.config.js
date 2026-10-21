import js from '@eslint/js';
import globals from 'globals';

/**
 * ESLint (flat config) del frontend.
 *
 * `Phaser` se declara como global de solo lectura porque el motor se importa
 * una sola vez en `src/main.js` y el resto de escenas/clases lo usan como
 * dependencia global (decisión heredada; ver docs/architecture.md).
 */
export default [
    { ignores: ['dist/**', 'node_modules/**'] },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                Phaser: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }]
        }
    }
];
