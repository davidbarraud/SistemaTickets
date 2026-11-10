import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

describe('POST /api/tickets/:id/close', () => {
  const app = createTestApp();
  const close = (id: number, auth: string) =>
    request(app).post(`/api/tickets/${id}/close`).set('Authorization', auth);

  async function resolvedTicketOf(owner: { user: { id: number } }) {
    const op = await createUserWithToken('OPERADOR');
    return seedTicket({
      requesterId: owner.user.id,
      status: 'RESUELTO',
      assigneeId: op.user.id,
      resolutionNote: 'Hecho',
    });
  }

  it('el Solicitante dueño confirma la resolución: CERRADO con fecha de cierre', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await resolvedTicketOf(ana);

    const res = await close(ticket.id, ana.auth);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CERRADO');
    expect(Date.parse(res.body.closedAt)).not.toBeNaN();
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('CERRADO');
    expect(stored.closedAt).not.toBeNull();
  });

  it('otro Solicitante intenta cerrar: 404 y el ticket sigue RESUELTO', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const juan = await createUserWithToken('SOLICITANTE');
    const ticket = await resolvedTicketOf(ana);

    const res = await close(ticket.id, juan.auth);

    expect(res.status).toBe(404);
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.status).toBe('RESUELTO');
  });

  it.each(['ABIERTO', 'EN_PROGRESO', 'CERRADO'] as const)(
    'ticket propio en %s: 409 y sin cambios',
    async (status) => {
      const ana = await createUserWithToken('SOLICITANTE');
      const ticket = await seedTicket({ requesterId: ana.user.id, status });

      const res = await close(ticket.id, ana.auth);

      expect(res.status).toBe(409);
      expect(res.body.error.details).toEqual({ currentStatus: status });
      const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(stored.status).toBe(status);
    },
  );

  it('Operador que intenta cerrar: 403', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await resolvedTicketOf(ana);
    const op = await createUserWithToken('OPERADOR');

    const res = await close(ticket.id, op.auth);

    expect(res.status).toBe(403);
  });

  it('ticket inexistente: 404', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const res = await close(999999, ana.auth);
    expect(res.status).toBe(404);
  });
});
