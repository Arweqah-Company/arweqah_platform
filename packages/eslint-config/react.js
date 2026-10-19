import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import base from './base.js';

/** Features talk to each other only through their public index.ts. */
const featureBoundaries = {
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*/*', '**/features/*/*'],
            message: 'Import a feature through its index.ts only.',
          },
        ],
      },
    ],
    'no-restricted-syntax': [
      'error',
      { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Render text, not HTML.' },
      {
        selector: ':function[params.length>4]:not(MethodDefinition[kind="constructor"] > FunctionExpression)',
        message: 'More than 4 parameters: pass an options object.',
      },
    ],
  },
};

export default [
  ...base,
  { languageOptions: { globals: globals.browser } },
  { plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
  featureBoundaries,
  // Components are mostly markup: allow 80 lines; logic still belongs in hooks.
  { files: ['**/*.tsx'], rules: { 'max-lines-per-function': ['warn', { max: 80, skipComments: true, skipBlankLines: true }] } },
  // Inside a feature, relative imports of its own files are fine.
  { files: ['src/features/**'], rules: { 'no-restricted-imports': 'off' } },
];
