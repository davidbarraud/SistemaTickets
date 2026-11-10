import { createApp, type AppDeps } from '../../src/app';
import { loadConfig } from '../../src/config';
import { prisma } from '../../src/db';
import { fakeGoogleVerifier } from './fakeGoogle';

/** Construye la app con la configuración de .env.test y el verificador de Google fake. */
export function createTestApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    prisma,
    config: loadConfig(process.env),
    googleVerifier: fakeGoogleVerifier,
    ...overrides,
  });
}
