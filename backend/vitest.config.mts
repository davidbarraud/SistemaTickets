import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Los tests siempre usan .env.test (base soporte_tickets_test), nunca .env.
const testEnv = parse(readFileSync(new URL('./.env.test', import.meta.url)));
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: testEnv,
    globalSetup: ['tests/setup/globalSetup.ts'],
    setupFiles: ['tests/setup/perFile.ts'],
    fileParallelism: false,
  },
});
