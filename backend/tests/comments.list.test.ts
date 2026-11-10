import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

describe('GET /api/tickets/:id/comments', () => {
  const app = createTestApp();
  const listComments = (id: number, auth: string) =>
    request(app).get(`/api/tickets/${id}/comments`).set('Authorization', auth);

  it('devuelve los comentarios en orden cronológico con nombre y rol del autor', async () => {
    const ana = await createUserWithToken('SOLICITANTE', { name: 'Ana' });
    const op = await createUserWithToken('OPERADOR', { name: 'Op Soporte' });
    const ticket = await seedTicket({ requesterId: ana.user.id, status: 'EN_PROGRESO', assigneeId: op.user.id });
    const t0 = Date.now() - 60_000;
    // Se insertan en orden inverso para comprobar que el orden lo da la fecha, no el id.
    await prisma.comment.create({
      data: { ticketId: ticket.id, authorId: op.user.id, body: 'segundo', createdAt: new Date(t0 + 1000) },
    });
    await prisma.comment.create({
      data: { ticketId: ticket.id, authorId: ana.user.id, body: 'primero', createdAt: new Date(t0) },
    });

    const res = await listComments(ticket.id, ana.auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      body: 'primero',
      author: { id: ana.user.id, name: 'Ana', role: 'SOLICITANTE' },
    });
    expect(res.body[1]).toMatchObject({
      body: 'segundo',
      author: { id: op.user.id, name: 'Op Soporte', role: 'OPERADOR' },
    });
    expect(Date.parse(res.body[0].createdAt)).not.toBeNaN();
  });

  it('solo devuelve los comentarios del ticket pedido', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const t1 = await seedTicket({ requesterId: ana.user.id });
    const t2 = await seedTicket({ requesterId: ana.user.id });
    await prisma.comment.create({ data: { ticketId: t2.id, authorId: ana.user.id, body: 'de otro ticket' } });

    const res = await listComments(t1.id, ana.auth);

    expect(res.body).toEqual([]);
  });

  it('un Operador puede leer los comentarios de cualquier ticket', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const op = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({ requesterId: ana.user.id, status: 'CERRADO' });
    await prisma.comment.create({ data: { ticketId: ticket.id, authorId: ana.user.id, body: 'hola' } });

    const res = await listComments(ticket.id, op.auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('un Solicitante que lee comentarios de un ticket ajeno recibe 404', async () => {
    const juan = await createUserWithToken('SOLICITANTE');
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: juan.user.id });

    const res = await listComments(ticket.id, ana.auth);

    expect(res.status).toBe(404);
  });
});
