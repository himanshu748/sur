import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'captures/**', 'local-evidence/**', 'dist/**'] },
  js.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];
