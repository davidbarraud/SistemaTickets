import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { authenticate, requireRole } from '../src/auth/middleware';
import { loadConfig } from '../src/config';
import { prisma } from '../src/db';
import { errorHandler } from '../src/errors';
import { createUserWithToken } from './helpers/auth';
import { createTestApp } from './helpers/testApp';

const config = loadConfig(process.env);

/** App mínima para probar los middlewares de forma aislada. */
function guardedApp() {
  const app = express();
  const auth = authenticate({ prisma, config });
  app.get('/privado', auth, (req, res) => {
    res.json({ userId: req.user!.id });
  });
  app.get('/solo-operador', auth, requireRole('OPERADOR'), (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/solo-solicitante', auth, requireRole('SOLICITANTE'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('authenticate', () => {
  const app = guardedApp();

  it('sin token responde 401', async () => {
    const res = await request(app).get('/privado');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('con un esquema distinto de Bearer responde 401', async () => {
    const { token } = await createUserWithToken('SOLICITANTE');
    const res = await request(app).get('/privado').set('Authorization', `Basic ${token}`);
    expect(res.status).toBe(401);
  });

  it('con token vencido responde 401', async () => {
    const { user } = await createUserWithToken('SOLICITANTE');
    const expired = jwt.sign({}, config.jwtSecret, { subject: String(user.id), expiresIn: -10 });
    const res = await request(app).get('/privado').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('con token firmado con otro secreto responde 401', async () => {
    const { user } = await createUserWithToken('SOLICITANTE');
    const forged = jwt.sign({}, 'otro-secreto-que-no-es-el-de-la-api-xxxxxxxx', {
      subject: String(user.id),
    });
    const res = await request(app).get('/privado').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('con token válido de un usuario borrado responde 401', async () => {
    const { user, auth } = await createUserWithToken('SOLICITANTE');
    await prisma.user.delete({ where: { id: user.id } });
    const res = await request(app).get('/privado').set('Authorization', auth);
    expect(res.status).toBe(401);
  });

  it('con token válido deja pasar y expone el usuario', async () => {
    const { user, auth } = await createUserWithToken('SOLICITANTE');
    const res = await request(app).get('/privado').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user.id);
  });
});

describe('requireRole', () => {
  const app = guardedApp();

  it('Solicitante en una ruta de Operador responde 403', async () => {
    const { auth } = await createUserWithToken('SOLICITANTE');
    const res = await request(app).get('/solo-operador').set('Authorization', auth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Operador en una ruta de Solicitante responde 403', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    const res = await request(app).get('/solo-solicitante').set('Authorization', auth);
    expect(res.status).toBe(403);
  });

  it('rol correcto deja pasar', async () => {
    const { auth } = await createUserWithToken('OPERADOR');
    const res = await request(app).get('/solo-operador').set('Authorization', auth);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  const app = createTestApp();

  it('devuelve id, email, nombre, foto y rol del usuario autenticado', async () => {
    const { user, auth } = await createUserWithToken('OPERADOR', {
      email: 'op@test.org',
      name: 'Op Uno',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      email: 'op@test.org',
      name: 'Op Uno',
      pictureUrl: null,
      role: 'OPERADOR',
    });
  });

  it('sin token responde 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
