import { prisma } from '../src/db';
import { resetDb } from './helpers/db';

describe('Base de datos de test', () => {
  it('usa la base soporte_tickets_test y no la de desarrollo', async () => {
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT DATABASE() AS db`;
    expect(rows[0].db).toBe('soporte_tickets_test');
  });

  it('resetDb deja todas las tablas vacías', async () => {
    const user = await prisma.user.create({
      data: { email: 'tmp@test.org', name: 'Tmp', role: 'SOLICITANTE' },
    });
    const ticket = await prisma.ticket.create({
      data: { title: 't', description: 'd', requesterId: user.id },
    });
    await prisma.comment.create({
      data: { ticketId: ticket.id, authorId: user.id, body: 'c' },
    });

    await resetDb();

    expect(await prisma.comment.count()).toBe(0);
    expect(await prisma.ticket.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
  });
});
