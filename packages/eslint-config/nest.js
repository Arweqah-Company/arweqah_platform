import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import base from './base.js';

/**
 * Layer rules for apps/api. Inside every module (and core/common):
 * presentation -> application -> domain, infrastructure -> domain.
 */
const apiBoundaries = {
  files: ['src/**/*.ts'],
  plugins: { boundaries },
  settings: {
    'boundaries/elements': [
      { type: 'domain', pattern: 'src/**/domain/**' },
      { type: 'application', pattern: 'src/**/application/**' },
      { type: 'infrastructure', pattern: 'src/**/infrastructure/**' },
      { type: 'presentation', pattern: 'src/**/presentation/**' },
    ],
    'import/resolver': { typescript: { project: './tsconfig.json' }, node: true },
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'allow',
        policies: [
          { from: { element: { type: 'domain' } }, disallow: { to: { element: { types: { anyOf: ['application', 'infrastructure', 'presentation'] } } } } },
          { from: { element: { type: 'application' } }, disallow: { to: { element: { types: { anyOf: ['infrastructure', 'presentation'] } } } } },
          { from: { element: { type: 'infrastructure' } }, disallow: { to: { element: { type: 'presentation' } } } },
        ],
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'typeorm',
            importNames: ['Repository', 'DataSource', 'EntityManager'],
            message: 'TypeORM data access belongs in infrastructure/.',
          },
        ],
      },
    ],
  },
};

const infraOverride = {
  files: ['src/**/infrastructure/**', 'src/database/**', 'test/**', 'src/**/*.spec.ts'],
  rules: { 'no-restricted-imports': 'off' },
};

export default [
  ...base,
  { languageOptions: { globals: globals.node } },
  apiBoundaries,
  infraOverride,
];
