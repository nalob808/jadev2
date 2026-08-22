// Flat config. Deliberately small: the type system does most of the work here.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', 'legacy/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The calculation core must stay pure. These bans are the enforcement.
    files: ['packages/astro/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'packages/astro must have no I/O. See CLAUDE.md.' },
        { name: 'localStorage', message: 'packages/astro must have no I/O.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'No ambient time in packages/astro — pass jdUT explicitly. See CLAUDE.md.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'No ambient time in packages/astro — pass jdUT explicitly. See CLAUDE.md.',
        },
      ],
    },
  },
);
