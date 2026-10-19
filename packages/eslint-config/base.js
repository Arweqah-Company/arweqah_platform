import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export const qualityRules = {
  rules: {
    complexity: ['error', 10],
    'max-depth': ['error', 3],
    // Functions take at most 4 parameters (use an options object). Constructors are exempt:
    // they receive injected dependencies.
    'no-restricted-syntax': [
      'error',
      {
        selector: ':function[params.length>4]:not(MethodDefinition[kind="constructor"] > FunctionExpression)',
        message: 'More than 4 parameters: pass an options object.',
      },
    ],
    'max-lines-per-function': ['warn', { max: 40, skipComments: true, skipBlankLines: true }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};

export default [
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/database/migrations/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  qualityRules,
  // Object-injection rule is noisy with typed lookups; keep the rest of the security set.
  { rules: { 'security/detect-object-injection': 'off' } },
  // describe() blocks group many tests; the length limit targets production functions.
  { files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.test.ts', '**/*.test.tsx'], rules: { 'max-lines-per-function': 'off' } },
];
