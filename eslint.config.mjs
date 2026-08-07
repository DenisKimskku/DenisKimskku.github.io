import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    '.next/**',
    'out/**',
    'node_modules/**',
    'next-env.d.ts',
    // Agent worktrees (each a full nested checkout, sometimes at an old
    // commit) silently multiplied the lint run into 12k+ false problems
    // when left on disk -- exclude the whole tooling directory outright.
    '.claude/**',
  ]),
]);
