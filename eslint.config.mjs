import globals from 'globals';

export default [
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Shared globals defined by classic (non-module) scripts and libs
        Chart: 'readonly',
        tailwind: 'readonly',
      },
    },
    rules: {
      // Likely bugs
      'no-undef': 'warn',
      'no-unused-vars': ['warn', {
        args: 'none',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'warn',
      'no-cond-assign': 'error',
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-self-assign': 'error',
      'no-self-compare': 'warn',
      'no-unsafe-negation': 'error',
      'no-fallthrough': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-semi': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'warn',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      eqeqeq: ['warn', 'smart'],
    },
  },
  {
    ignores: ['node_modules/**', 'js/**/*.min.js'],
  },
];
