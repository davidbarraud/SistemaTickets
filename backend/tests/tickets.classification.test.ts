import request from 'supertest';
import { prisma } from '../src/db';
import { createUserWithToken } from './helpers/auth';
import { seedTicket } from './helpers/tickets';
import { createTestApp } from './helpers/testApp';

const app = createTestApp();
const base = { title: 'Sin red', description: 'No hay internet' };

describe('Clasificación al crear (POST /api/tickets)', () => {
  const create = (auth: string, body: unknown) =>
    request(app).post('/api/tickets').set('Authorization', auth).send(body as object);

  it('guarda y devuelve la prioridad y la categoría elegidas', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');

    const res = await create(auth, { ...base, priority: 'ALTA', category: 'HARDWARE' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ priority: 'ALTA', category: 'HARDWARE' });
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored).toMatchObject({ priority: 'ALTA', category: 'HARDWARE' });
  });

  it('sin prioridad ni categoría usa MEDIA y OTRO', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');

    const res = await create(auth, base);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ priority: 'MEDIA', category: 'OTRO' });
  });

  it('prioridad inexistente: 400 indicando el campo y no crea el ticket', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');

    const res = await create(auth, { ...base, priority: 'CRITICA' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'priority' })]));
    expect(await prisma.ticket.count()).toBe(0);
  });

  it('categoría inexistente: 400 indicando el campo', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');

    const res = await create(auth, { ...base, category: 'IMPRESORAS' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'category' })]));
    expect(await prisma.ticket.count()).toBe(0);
  });

  it('el listado y el detalle incluyen prioridad y categoría', async () => {
    const { user, auth } = await createUserWithToken('SOLICITANTE');
    const t = await seedTicket({ requesterId: user.id, priority: 'URGENTE', category: 'RED' });

    const detail = await request(app).get(`/api/tickets/${t.id}`).set('Authorization', auth);
    const list = await request(app).get('/api/tickets').set('Authorization', auth);

    expect(detail.body).toMatchObject({ priority: 'URGENTE', category: 'RED' });
    expect(list.body[0]).toMatchObject({ priority: 'URGENTE', category: 'RED' });
  });
});

describe('Filtro y orden por prioridad (GET /api/tickets)', () => {
  const list = (auth: string, query: string) => request(app).get(`/api/tickets${query}`).set('Authorization', auth);
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

  it('filtra por prioridad, combinable con el estado', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    const target = await seedTicket({ requesterId: ana.id, status: 'ABIERTO', priority: 'URGENTE' });
    await seedTicket({ requesterId: ana.id, status: 'ABIERTO', priority: 'BAJA' });
    await seedTicket({ requesterId: ana.id, status: 'EN_PROGRESO', priority: 'URGENTE' });

    const res = await list(auth, '?status=ABIERTO&priority=URGENTE');

    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([target.id]);
  });

  it('prioridad inválida en el filtro: 400', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    expect((await list(auth, '?priority=CRITICA')).status).toBe(400);
  });

  it('el Solicitante solo filtra entre sus propios tickets', async () => {
    const { user: ana, auth } = await createUserWithToken('SOLICITANTE');
    const { user: juan } = await createUserWithToken('SOLICITANTE');
    const mine = await seedTicket({ requesterId: ana.id, priority: 'ALTA' });
    await seedTicket({ requesterId: juan.id, priority: 'ALTA' });

    const res = await list(auth, '?priority=ALTA');

    expect(res.body.map((t: { id: number }) => t.id)).toEqual([mine.id]);
  });

  it('sort=priority ordena de URGENTE a BAJA', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    const baja = await seedTicket({ requesterId: ana.id, priority: 'BAJA', createdAt: minutesAgo(3) });
    const urgente = await seedTicket({ requesterId: ana.id, priority: 'URGENTE', createdAt: minutesAgo(2) });
    const media = await seedTicket({ requesterId: ana.id, priority: 'MEDIA', createdAt: minutesAgo(1) });
    const alta = await seedTicket({ requesterId: ana.id, priority: 'ALTA', createdAt: minutesAgo(4) });

    const res = await list(auth, '?sort=priority');

    expect(res.body.map((t: { id: number }) => t.id)).toEqual([urgente.id, alta.id, media.id, baja.id]);
  });

  it('dentro de una misma prioridad, el más reciente primero', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    const older = await seedTicket({ requesterId: ana.id, priority: 'ALTA', createdAt: minutesAgo(10) });
    const newer = await seedTicket({ requesterId: ana.id, priority: 'ALTA', createdAt: minutesAgo(1) });

    const res = await list(auth, '?sort=priority');

    expect(res.body.map((t: { id: number }) => t.id)).toEqual([newer.id, older.id]);
  });

  it('sin sort se mantiene el orden por fecha, sin importar la prioridad', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    const urgenteViejo = await seedTicket({ requesterId: ana.id, priority: 'URGENTE', createdAt: minutesAgo(10) });
    const bajaNuevo = await seedTicket({ requesterId: ana.id, priority: 'BAJA', createdAt: minutesAgo(1) });

    const res = await list(auth, '');

    expect(res.body.map((t: { id: number }) => t.id)).toEqual([bajaNuevo.id, urgenteViejo.id]);
  });

  it('un sort desconocido: 400', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    expect((await list(auth, '?sort=titulo')).status).toBe(400);
  });
});

describe('Cambio de prioridad (PATCH /api/tickets/:id/priority)', () => {
  const patch = (auth: string, id: number | string, body: unknown) =>
    request(app).patch(`/api/tickets/${id}/priority`).set('Authorization', auth).send(body as object);

  it('el Operador asignado la cambia sin alterar estado, asignado ni categoría', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { user: op, auth } = await createUserWithToken('OPERADOR');
    const t = await seedTicket({
      requesterId: ana.id,
      status: 'EN_PROGRESO',
      assigneeId: op.id,
      priority: 'MEDIA',
      category: 'SOFTWARE',
    });

    const res = await patch(auth, t.id, { priority: 'URGENTE' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ priority: 'URGENTE', status: 'EN_PROGRESO', category: 'SOFTWARE', assignee: { id: op.id } });
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(stored).toMatchObject({ priority: 'URGENTE', status: 'EN_PROGRESO', assigneeId: op.id, category: 'SOFTWARE' });
  });

  it('un Operador no asignado también puede cambiarla (ticket ABIERTO)', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    const t = await seedTicket({ requesterId: ana.id, status: 'ABIERTO' });

    const res = await patch(auth, t.id, { priority: 'BAJA' });

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('BAJA');
  });

  it('el Solicitante dueño recibe 403 y la prioridad no cambia', async () => {
    const { user: ana, auth } = await createUserWithToken('SOLICITANTE');
    const t = await seedTicket({ requesterId: ana.id, priority: 'MEDIA' });

    const res = await patch(auth, t.id, { priority: 'URGENTE' });

    expect(res.status).toBe(403);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).priority).toBe('MEDIA');
  });

  it('valor inválido o ausente: 400', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    const t = await seedTicket({ requesterId: ana.id });

    expect((await patch(auth, t.id, { priority: 'ALTISIMA' })).status).toBe(400);
    expect((await patch(auth, t.id, {})).status).toBe(400);
  });

  it('ticket inexistente: 404', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    expect((await patch(auth, 999999, { priority: 'ALTA' })).status).toBe(404);
  });

  it('ticket CERRADO: 409 y la prioridad no cambia', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { user: op, auth } = await createUserWithToken('OPERADOR');
    const t = await seedTicket({ requesterId: ana.id, status: 'CERRADO', assigneeId: op.id, priority: 'BAJA' });

    const res = await patch(auth, t.id, { priority: 'URGENTE' });

    expect(res.status).toBe(409);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).priority).toBe('BAJA');
  });

  it('sin sesión: 401', async () => {
    expect((await request(app).patch('/api/tickets/1/priority').send({ priority: 'ALTA' })).status).toBe(401);
  });
});

describe('Resumen por estado (GET /api/tickets/summary)', () => {
  const summary = (auth: string) => request(app).get('/api/tickets/summary').set('Authorization', auth);

  it('el Operador recibe los conteos de todos los tickets, con ceros', async () => {
    const { user: ana } = await createUserWithToken('SOLICITANTE');
    const { user: juan } = await createUserWithToken('SOLICITANTE');
    const { auth } = await createUserWithToken('OPERADOR');
    await seedTicket({ requesterId: ana.id, status: 'ABIERTO' });
    await seedTicket({ requesterId: juan.id, status: 'ABIERTO' });
    await seedTicket({ requesterId: juan.id, status: 'RESUELTO' });

    const res = await summary(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ABIERTO: 2, EN_PROGRESO: 0, RESUELTO: 1, CERRADO: 0 });
  });

  it('el Solicitante solo cuenta sus propios tickets', async () => {
    const { user: ana, auth } = await createUserWithToken('SOLICITANTE');
    const { user: juan } = await createUserWithToken('SOLICITANTE');
    await seedTicket({ requesterId: ana.id, status: 'CERRADO' });
    await seedTicket({ requesterId: juan.id, status: 'ABIERTO' });

    const res = await summary(auth);

    expect(res.body).toEqual({ ABIERTO: 0, EN_PROGRESO: 0, RESUELTO: 0, CERRADO: 1 });
  });

  it('sin sesión: 401', async () => {
    expect((await request(app).get('/api/tickets/summary')).status).toBe(401);
  });
});
