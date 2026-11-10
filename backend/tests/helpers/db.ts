import { prisma } from '../../src/db';

/**
 * Vacía las tablas respetando las claves foráneas (Comment -> Ticket -> User).
 * Se niega a correr si DATABASE_URL no apunta a una base *_test.
 */
export async function resetDb(): Promise<void> {
  if (!(process.env.DATABASE_URL ?? '').includes('_test')) {
    throw new Error('resetDb solo puede ejecutarse contra una base *_test');
  }
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
}
