import { defineConfig } from 'orval';

export default defineConfig({
  spender: {
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/mutator.ts',
          name: 'customFetch',
        },
      },
    },
    input: {
      // Shared, committed API contract at the monorepo root. Currently written by
      // backends/csharp/Spender.API on build; every backend must satisfy it.
      target: '../../contract/openapi.json',
    },
  },
});
