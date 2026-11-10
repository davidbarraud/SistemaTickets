import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado; lo completa el middleware authenticate. */
      user?: User;
    }
  }
}

export {};
