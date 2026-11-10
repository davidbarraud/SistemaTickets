import { execSync } from 'node:child_process';

/**
 * Se ejecuta una vez antes de toda la corrida: aplica las migraciones
 * pendientes a la base de test (soporte_tickets_test). No borra datos;
 * la limpieza entre tests la hace resetDb().
 */
export default function globalSetup(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('_test')) {
    throw new Error(`Los tests deben usar una base *_test. DATABASE_URL actual: ${url}`);
  }
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
}
