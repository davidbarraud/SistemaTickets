import request from 'supertest';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe('GET /api/tickets', () => {
  const app = createTestApp();
  const list = (auth: string, query = '') =>
    request(app).get(`/api/tickets${query}`).set('Authorization', auth);

  it('el Solicitante ve solo sus tickets, del más reciente al más antiguo', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const juan = await createUserWithToken('SOLICITANTE');
    const viejo = await seedTicket({ requesterId: ana.user.id, title: 'viejo', createdAt: minutesAgo(30) });
    const nuevo = await seedTicket({ requesterId: ana.user.id, title: 'nuevo', createdAt: minutesAgo(1) });
    for (let i = 0; i < 3; i++) await seedTicket({ requesterId: juan.user.id });

    const res = await list(ana.auth);

    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([nuevo.id, viejo.id]);
  });

  it('cada ticket del listado incluye id, título, estado, asignado y fechas', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const op = await createUserWithToken('OPERADOR');
    await seedTicket({ requesterId: ana.user.id, status: 'EN_PROGRESO', assigneeId: op.user.id });

    const res = await list(ana.auth);

    expect(res.body[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      status: 'EN_PROGRESO',
      assignee: { id: op.user.id, name: op.user.name },
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('el Operador ve todos los tickets con nombre y email del solicitante', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const juan = await createUserWithToken('SOLICITANTE');
    const op = await createUserWithToken('OPERADOR');
    await seedTicket({ requesterId: ana.user.id, createdAt: minutesAgo(5) });
    await seedTicket({ requesterId: juan.user.id, createdAt: minutesAgo(2) });

    const res = await list(op.auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].requester).toEqual({ id: juan.user.id, name: juan.user.name, email: juan.user.email });
    expect(res.body[1].requester).toEqual({ id: ana.user.id, name: ana.user.name, email: ana.user.email });
  });

  it('el Operador filtra por estado ABIERTO', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const op = await createUserWithToken('OPERADOR');
    for (let i = 0; i < 2; i++) await seedTicket({ requesterId: ana.user.id, status: 'ABIERTO' });
    for (let i = 0; i < 3; i++) {
      await seedTicket({ requesterId: ana.user.id, status: 'EN_PROGRESO', assigneeId: op.user.id });
    }

    const res = await list(op.auth, '?status=ABIERTO');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((t: { status: string }) => t.status === 'ABIERTO')).toBe(true);
  });

  it('el filtro del Solicitante se aplica solo sobre sus propios tickets', async () => {
    const ana = await createUserWithToken('SOLICITANTE');
    const juan = await createUserWithToken('SOLICITANTE');
    const mio = await seedTicket({ requesterId: ana.user.id, status: 'ABIERTO' });
    await seedTicket({ requesterId: ana.user.id, status: 'CERRADO' });
    await seedTicket({ requesterId: juan.user.id, status: 'ABIERTO' });

    const res = await list(ana.auth, '?status=ABIERTO');

    expect(res.body.map((t: { id: number }) => t.id)).toEqual([mio.id]);
  });

  it('filtro con un estado inválido: 400', async () => {
    const op = await createUserWithToken('OPERADOR');
    const res = await list(op.auth, '?status=PENDIENTE');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sin sesión: 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });
});
