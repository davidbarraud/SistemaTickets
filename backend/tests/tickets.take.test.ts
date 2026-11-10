import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

describe('POST /api/tickets/:id/take', () => {
  const app = createTestApp();
  const take = (id: number | string, auth: string) =>
    request(app).post(`/api/tickets/${id}/take`).set('Authorization', auth);

  it('Operador toma un ticket ABIERTO: pasa a EN_PROGRESO y queda asignado', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { user: op, auth } = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({ requesterId: ana.id });

    const res = await take(ticket.id, auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: ticket.id,
      status: 'EN_PROGRESO',
      assignee: { id: op.id, name: op.name, email: op.email },
    });
    expect(Date.parse(res.body.startedAt)).not.toBeNaN();

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('EN_PROGRESO');
    expect(stored.assigneeId).toBe(op.id);
    expect(stored.startedAt).not.toBeNull();
  });

  it('dos Operadores toman el mismo ticket a la vez: solo uno queda asignado y el otro recibe 409', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const op1 = await createUserWithToken('OPERADOR');
    const op2 = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({ requesterId: ana.id });

    const [r1, r2] = await Promise.all([take(ticket.id, op1.auth), take(ticket.id, op2.auth)]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const winner = r1.status === 200 ? op1.user : op2.user;
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.assigneeId).toBe(winner.id);
  });

  it('ticket inexistente: 404', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    const res = await take(999999, auth);
    expect(res.status).toBe(404);
  });

  it('id no numérico: 404', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    const res = await take('abc', auth);
    expect(res.status).toBe(404);
  });

  it.each(['EN_PROGRESO', 'RESUELTO', 'CERRADO'] as const)(
    'ticket en %s: 409 indicando el estado actual y sin cambios',
    async (status) => {
      const { user: ana } = await createUserWithToken('SOLICITANTE');
      const { user: op1 } = await createUserWithToken('OPERADOR');
      const { auth } = await createUserWithToken('OPERADOR');
      const ticket = await seedTicket({ requesterId: ana.id, status, assigneeId: op1.id });

      const res = await take(ticket.id, auth);

      expect(res.status).toBe(409);
      expect(res.body.error.details).toEqual({ currentStatus: status });
      const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(stored.status).toBe(status);
      expect(stored.assigneeId).toBe(op1.id);
    },
  );

  it('Solicitante que intenta tomar: 403 y el ticket no cambia', async () => {
    const { user: ana, auth } = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: ana.id });

    const res = await take(ticket.id, auth);

    expect(res.status).toBe(403);
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('ABIERTO');
  });
});
