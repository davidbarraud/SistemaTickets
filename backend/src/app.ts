import cors from 'cors';
import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { authRoutes } from './auth/authRoutes';
import type { GoogleVerifier } from './auth/googleVerifier';
import { commentRoutes } from './comments/commentRoutes';
import type { AppConfig } from './config';
import { errorHandler, notFoundHandler } from './errors';
import { ticketRoutes } from './tickets/ticketRoutes';

export interface AppDeps {
  prisma: PrismaClient;
  config: AppConfig;
  googleVerifier: GoogleVerifier;
}

export function createApp(deps: AppDeps) {
  const app = express();

  app.use(cors({ origin: deps.config.frontendOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(deps));
  app.use('/api/tickets/:id/comments', commentRoutes(deps));
  app.use('/api/tickets', ticketRoutes(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
