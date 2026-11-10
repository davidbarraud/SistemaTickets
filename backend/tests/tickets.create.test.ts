import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { createTestApp } from './helpers/testApp';

describe('POST /api/tickets', () => {
  const app = createTestApp();
  const create = (auth: string, body: unknown) =>
    request(app).post('/api/tickets').set('Authorization', auth).send(body as object);

  it('Solicitante crea un ticket: 201, ABIERTO, sin operador asignado', async () => {
    const { user, auth } = await createUserWithToken('SOLICITANTE');

    const res = await create(auth, {
      title: '  No funciona la impresora  ',
      description: 'La impresora del 2do piso no imprime.',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      title: 'No funciona la impresora',
      description: 'La impresora del 2do piso no imprime.',
      status: 'ABIERTO',
      requester: { id: user.id, name: user.name, email: user.email },
      assignee: null,
      resolutionNote: null,
      startedAt: null,
      resolvedAt: null,
      closedAt: null,
    });
    expect(Date.parse(res.body.createdAt)).not.toBeNaN();

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.requesterId).toBe(user.id);
    expect(stored.status).toBe('ABIERTO');
  });

  it('acepta un título de exactamente 150 caracteres', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');
    const res = await create(auth, { title: 'a'.repeat(150), description: 'd' });
    expect(res.status).toBe(201);
  });

  it('título de solo espacios: 400 indicando el campo title y no crea nada', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');

    const res = await create(auth, { title: '   ', description: 'Algo' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
    );
    expect(await prisma.ticket.count()).toBe(0);
  });

  it('título de 151 caracteres: 400', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');
    const res = await create(auth, { title: 'a'.repeat(151), description: 'd' });
    expect(res.status).toBe(400);
  });

  it('descripción ausente: 400 indicando el campo description', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');
    const res = await create(auth, { title: 'Sin descripción' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'description' })]),
    );
  });

  it('descripción de más de 5000 caracteres: 400', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');
    const res = await create(auth, { title: 'Larga', description: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
  });

  it('Operador que intenta crear un ticket: 403', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    const res = await create(auth, { title: 'Ticket', description: 'd' });
    expect(res.status).toBe(403);
    expect(await prisma.ticket.count()).toBe(0);
  });

  it('sin sesión: 401', async () => {
    const res = await request(app).post('/api/tickets').send({ title: 't', description: 'd' });
    expect(res.status).toBe(401);
  });
});
