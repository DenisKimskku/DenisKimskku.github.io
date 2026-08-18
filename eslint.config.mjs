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
  {
    rules: {
      // Underscore-prefixed args are deliberately-unused parameters required
      // by an external signature -- e.g. the Cloudflare Durable Object
      // constructor must accept (state, env) even where env is unused.
      // Without this the only way to silence the warning is deleting a
      // parameter the platform requires.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The Worker entry point is a module-default object literal by
    // Cloudflare's own contract (`export default { fetch }`), so the
    // named-export refactor this rule suggests is not available here.
    files: ['cloudflare-worker/src/index.ts'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
]);
