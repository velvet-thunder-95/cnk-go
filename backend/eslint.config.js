import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: [ 'node_modules/**' ] },
    js.configs.recommended,
    {
        languageOptions: {
            globals: globals.node,
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        rules: {
            indent: ['error', 4],

            // Spaces inside object literals: { key: val } not {key: val}
            'object-curly-spacing': ['error', 'always'],

            // Enforce spaces inside parentheses: if ( condition )
            // 'space-in-parens': ['error', 'always'],

            // Enforce spaces around keywords: if ( ... )
            // 'keyword-spacing': ['error', { before: true, after: true }],

            // Enforce spaces before blocks: ) {
            // 'space-before-blocks': ['error', 'always'],

            // Max 1 consecutive blank line
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],

            // Require blank line before return in multi-line blocks
            'newline-before-return': 'error',

            'no-console': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            eqeqeq: ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-throw-literal': 'error',
        },
    },
];
