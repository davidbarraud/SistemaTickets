import { Router } from 'express';
import type { User } from '@prisma/client';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { unauthorized } from '../errors';
import { authenticate } from './middleware';
import { resolveRole } from './resolveRole';
import { signSessionToken } from './tokens';

const loginSchema = z.object({ credential: z.string().min(1) });

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    pictureUrl: user.pictureUrl,
    role: user.role,
  };
}

export function authRoutes({ prisma, config, googleVerifier }: AppDeps) {
  const router = Router();

  router.post('/google', async (req, res) => {
    const { credential } = loginSchema.parse(req.body ?? {});

    let profile;
    try {
      profile = await googleVerifier.verify(credential);
    } catch (err) {
      // Solo en el log del servidor: la respuesta al cliente no revela el motivo.
      console.warn('[auth] Falló la verificación de Google:', err instanceof Error ? err.message : err);
      throw unauthorized('Credencial de Google inválida');
    }
    if (!profile.emailVerified) {
      throw unauthorized('El email de Google no está verificado');
    }

    const email = profile.email.trim().toLowerCase();
    const role = resolveRole(email, config.operatorEmails);
    const data = { name: profile.name, pictureUrl: profile.picture ?? null, role };

    const user = await prisma.user.upsert({
      where: { email },
      create: { email, ...data },
      update: data,
    });

    res.json({ token: signSessionToken(user.id, config), user: toPublicUser(user) });
  });

  router.get('/me', authenticate({ prisma, config }), (req, res) => {
    res.json(toPublicUser(req.user!));
  });

  return router;
}
