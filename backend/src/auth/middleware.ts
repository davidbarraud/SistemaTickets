import type { RequestHandler } from 'express';
import type { PrismaClient, UserRole } from '@prisma/client';
import type { AppConfig } from '../config';
import { forbidden, unauthorized } from '../errors';
import { verifySessionToken } from './tokens';

/**
 * Exige un header "Authorization: Bearer <token>" válido y vigente, y carga el
 * usuario desde la base en cada request (así se usa siempre el rol guardado).
 */
export function authenticate({ prisma, config }: { prisma: PrismaClient; config: AppConfig }): RequestHandler {
  return async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    const userId = verifySessionToken(token, config);
    if (!userId) throw unauthorized('Sesión inválida o vencida');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized('Sesión inválida o vencida');

    req.user = user;
    next();
  };
}

/** Exige que el usuario autenticado tenga el rol indicado; si no, responde 403. */
export function requireRole(role: UserRole): RequestHandler {
  return (req, _res, next) => {
    if (req.user?.role !== role) throw forbidden();
    next();
  };
}
