import request from 'supertest';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

describe('GET /api/tickets/:id', () => {
  const app = createTestApp();
  const detail = (id: number | string, auth: string) =>
    request(app).get(`/api/tickets/${id}`).set('Authorization', auth);

  async function resolvedTicket() {
    const ana = await createUserWithToken('SOLICITANTE');
    const op = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({
      requesterId: ana.user.id,
      status: 'RESUELTO',
      assigneeId: op.user.id,
      resolutionNote: 'Se cambió el tóner',
    });
    return { ana, op, ticket };
  }

  it('un Operador ve el detalle completo, incluida la nota de resolución', async () => {
    const { ana, op, ticket } = await resolvedTicket();
    const otroOp = await createUserWithToken('OPERADOR');

    const res = await detail(ticket.id, otroOp.auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: 'RESUELTO',
      requester: { id: ana.user.id, name: ana.user.name, email: ana.user.email },
      assignee: { id: op.user.id, name: op.user.name, email: op.user.email },
      resolutionNote: 'Se cambió el tóner',
      closedAt: null,
    });
    for (const field of ['createdAt', 'updatedAt', 'startedAt', 'resolvedAt']) {
      expect(Date.parse(res.body[field])).not.toBeNaN();
    }
  });

  it('el Solicitante dueño ve el detalle de su ticket', async () => {
    const { ana, ticket } = await resolvedTicket();

    const res = await detail(ticket.id, ana.auth);

    expect(res.status).toBe(200);
    expect(res.body.resolutionNote).toBe('Se cambió el tóner');
  });

  it('un Solicitante que consulta un ticket ajeno recibe 404', async () => {
    const { ticket } = await resolvedTicket();
    const juan = await createUserWithToken('SOLICITANTE');

    const res = await detail(ticket.id, juan.auth);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('ticket inexistente: 404 (el mismo error que un ticket ajeno)', async () => {
    const juan = await createUserWithToken('SOLICITANTE');
    const res = await detail(999999, juan.auth);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sin sesión: 401', async () => {
    const res = await request(app).get('/api/tickets/1');
    expect(res.status).toBe(401);
  });
});
