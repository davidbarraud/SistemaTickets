import jwt from 'jsonwebtoken';
import request from 'supertest';
import { prisma } from '../src/db';
import { googleCredential } from './helpers/fakeGoogle';
import { createTestApp } from './helpers/testApp';

// En .env.test: OPERATOR_EMAILS="operador@test.org, op2@test.org"
describe('POST /api/auth/google', () => {
  const app = createTestApp();
  const login = (credential: unknown) =>
    request(app).post('/api/auth/google').send({ credential });

  it('primer ingreso: crea el usuario y devuelve token y datos con rol', async () => {
    const res = await login(
      googleCredential({ email: 'ana@test.org', name: 'Ana Pérez', picture: 'https://img/ana.png' }),
    );

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'ana@test.org',
      name: 'Ana Pérez',
      pictureUrl: 'https://img/ana.png',
      role: 'SOLICITANTE',
    });
    expect(res.body.user.id).toEqual(expect.any(Number));

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.sub).toBe(String(res.body.user.id));

    expect(await prisma.user.count({ where: { email: 'ana@test.org' } })).toBe(1);
  });

  it('ingreso repetido: no duplica el usuario y actualiza nombre y foto', async () => {
    const first = await login(googleCredential({ email: 'ana@test.org', name: 'Ana' }));
    const second = await login(
      googleCredential({ email: 'ana@test.org', name: 'Ana María', picture: 'https://img/nueva.png' }),
    );

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(second.body.user).toMatchObject({ name: 'Ana María', pictureUrl: 'https://img/nueva.png' });
    expect(second.body.token).toEqual(expect.any(String));
    expect(await prisma.user.count()).toBe(1);
  });

  it('asigna OPERADOR si el email está en OPERATOR_EMAILS, sin distinguir mayúsculas', async () => {
    const res = await login(googleCredential({ email: 'Operador@Test.org' }));

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('OPERADOR');
  });

  it('asigna SOLICITANTE si el email no está en OPERATOR_EMAILS', async () => {
    const res = await login(googleCredential({ email: 'juan@test.org' }));

    expect(res.body.user.role).toBe('SOLICITANTE');
  });

  it('recalcula el rol: un ex operador quitado de la lista pasa a SOLICITANTE', async () => {
    await prisma.user.create({
      data: { email: 'exop@test.org', name: 'Ex Op', role: 'OPERADOR' },
    });

    const res = await login(googleCredential({ email: 'exop@test.org' }));

    expect(res.body.user.role).toBe('SOLICITANTE');
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'exop@test.org' } });
    expect(stored.role).toBe('SOLICITANTE');
  });

  it('credencial inválida: responde 401 y no crea usuarios', async () => {
    const res = await login('token-adulterado');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(await prisma.user.count()).toBe(0);
  });

  it('email no verificado: responde 401 y no crea usuarios', async () => {
    const res = await login(googleCredential({ email: 'nover@test.org', emailVerified: false }));

    expect(res.status).toBe(401);
    expect(await prisma.user.count()).toBe(0);
  });

  it('sin credencial: responde 400', async () => {
    const res = await login(undefined);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
