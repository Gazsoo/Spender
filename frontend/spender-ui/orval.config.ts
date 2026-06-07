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
      // Generated at build time by Spender.API (Microsoft.Extensions.ApiDescription.Server),
      // so the spec never needs a running server to regenerate the client.
      target: '../../Spender.API/openapi/Spender.API.json',
    },
  },
});
