import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

describe('POST /api/tickets/:id/resolve', () => {
  const app = createTestApp();
  const resolve = (id: number, auth: string, body: unknown) =>
    request(app).post(`/api/tickets/${id}/resolve`).set('Authorization', auth).send(body as object);

  async function ticketInProgress() {
    const ana = await createUserWithToken('SOLICITANTE');
    const op1 = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({
      requesterId: ana.user.id,
      status: 'EN_PROGRESO',
      assigneeId: op1.user.id,
    });
    return { ana, op1, ticket };
  }

  it('el Operador asignado resuelve con nota: RESUELTO, nota y fecha guardadas', async () => {
    const { op1, ticket } = await ticketInProgress();

    const res = await resolve(ticket.id, op1.auth, { resolutionNote: '  Se reinstaló el driver  ' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'RESUELTO',
      resolutionNote: 'Se reinstaló el driver',
      assignee: { id: op1.user.id },
    });
    expect(Date.parse(res.body.resolvedAt)).not.toBeNaN();

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('RESUELTO');
    expect(stored.resolutionNote).toBe('Se reinstaló el driver');
    expect(stored.resolvedAt).not.toBeNull();
  });

  it('nota vacía: 400 y el ticket sigue EN_PROGRESO', async () => {
    const { op1, ticket } = await ticketInProgress();

    const res = await resolve(ticket.id, op1.auth, { resolutionNote: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'resolutionNote' })]),
    );
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('EN_PROGRESO');
  });

  it('sin nota: 400', async () => {
    const { op1, ticket } = await ticketInProgress();
    const res = await resolve(ticket.id, op1.auth, {});
    expect(res.status).toBe(400);
  });

  it('nota de más de 5000 caracteres: 400', async () => {
    const { op1, ticket } = await ticketInProgress();
    const res = await resolve(ticket.id, op1.auth, { resolutionNote: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
  });

  it('otro Operador intenta resolver: 403 y el ticket sigue EN_PROGRESO', async () => {
    const { ticket } = await ticketInProgress();
    const op2 = await createUserWithToken('OPERADOR');

    const res = await resolve(ticket.id, op2.auth, { resolutionNote: 'Listo' });

    expect(res.status).toBe(403);
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('EN_PROGRESO');
    expect(stored.resolutionNote).toBeNull();
  });

  it.each(['ABIERTO', 'RESUELTO', 'CERRADO'] as const)(
    'ticket en %s: 409 indicando el estado actual',
    async (status) => {
      const ana = await createUserWithToken('SOLICITANTE');
      const op1 = await createUserWithToken('OPERADOR');
      const ticket = await seedTicket({
        requesterId: ana.user.id,
        status,
        assigneeId: status === 'ABIERTO' ? null : op1.user.id,
      });

      const res = await resolve(ticket.id, op1.auth, { resolutionNote: 'Nota' });

      expect(res.status).toBe(409);
      expect(res.body.error.details).toEqual({ currentStatus: status });
    },
  );

  it('ticket inexistente: 404', async () => {
    const op = await createUserWithToken('OPERADOR');
    const res = await resolve(999999, op.auth, { resolutionNote: 'Nota' });
    expect(res.status).toBe(404);
  });

  it('Solicitante que intenta resolver: 403', async () => {
    const { ana, ticket } = await ticketInProgress();
    const res = await resolve(ticket.id, ana.auth, { resolutionNote: 'Nota' });
    expect(res.status).toBe(403);
  });
});
