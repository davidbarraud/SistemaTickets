import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

describe('POST /api/tickets/:id/comments', () => {
  const app = createTestApp();
  const comment = (id: number, auth: string, body: unknown) =>
    request(app)
      .post(`/api/tickets/${id}/comments`)
      .set('Authorization', auth)
      .send(body as object);

  it('el Solicitante dueño comenta su ticket: 201 con autor y fecha', async () => {
    const ana = await createUserWithToken('SOLICITANTE', { name: 'Ana' });
    const op = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({ requesterId: ana.user.id, status: 'EN_PROGRESO', assigneeId: op.user.id });

    const res = await comment(ticket.id, ana.auth, { body: '  Sigue fallando después de reiniciar ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      body: 'Sigue fallando después de reiniciar',
      author: { id: ana.user.id, name: 'Ana', role: 'SOLICITANTE' },
    });
    expect(Date.parse(res.body.createdAt)).not.toBeNaN();

    const stored = await prisma.comment.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.ticketId).toBe(ticket.id);
    expect(stored.authorId).toBe(ana.user.id);
  });

  it('un Operador comenta un ticket ABIERTO: 201', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const op = await createUserWithToken('OPERADOR');
    const ticket = await seedTicket({ requesterId: ana.user.id });

    const res = await comment(ticket.id, op.auth, { body: '¿Qué modelo de impresora es?' });

    expect(res.status).toBe(201);
    expect(res.body.author).toMatchObject({ id: op.user.id, role: 'OPERADOR' });
  });

  it('comentario de solo espacios: 400 y no se guarda', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: ana.user.id });

    const res = await comment(ticket.id, ana.auth, { body: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'body' })]),
    );
    expect(await prisma.comment.count()).toBe(0);
  });

  it('comentario de más de 2000 caracteres: 400', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: ana.user.id });
    const res = await comment(ticket.id, ana.auth, { body: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
  });

  it('acepta un comentario de exactamente 2000 caracteres', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: ana.user.id });
    const res = await comment(ticket.id, ana.auth, { body: 'x'.repeat(2000) });
    expect(res.status).toBe(201);
  });

  it('ticket CERRADO: 409 y no se guarda', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: ana.user.id, status: 'CERRADO' });

    const res = await comment(ticket.id, ana.auth, { body: 'Gracias' });

    expect(res.status).toBe(409);
    expect(await prisma.comment.count()).toBe(0);
  });

  it('un Solicitante que comenta un ticket ajeno recibe 404', async () => {
    const juan = await createUserWithToken('SOLICITANTE');
    const ana = await createUserWithToken('SOLICITANTE');
    const ticket = await seedTicket({ requesterId: juan.user.id });

    const res = await comment(ticket.id, ana.auth, { body: 'Hola' });

    expect(res.status).toBe(404);
    expect(await prisma.comment.count()).toBe(0);
  });

  it('sin sesión: 401', async () => {
    const res = await request(app).post('/api/tickets/1/comments').send({ body: 'x' });
    expect(res.status).toBe(401);
  });
});
