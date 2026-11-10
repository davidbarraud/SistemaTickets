import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { authenticate } from '../auth/middleware';
import { conflict } from '../errors';
import { findVisibleTicket, parseTicketId } from '../tickets/applyTransition';

const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'El comentario no puede estar vacío').max(2000, 'Máximo 2000 caracteres'),
});

const commentInclude = { author: { select: { id: true, name: true, role: true } } } as const;

/** Rutas montadas en /api/tickets/:id/comments. */
export function commentRoutes({ prisma, config }: AppDeps) {
  const router = Router({ mergeParams: true });
  router.use(authenticate({ prisma, config }));

  // El :id viene de la ruta padre (mergeParams), por eso no está en el tipo de req.params.
  const ticketIdOf = (params: object) => parseTicketId((params as { id?: unknown }).id);

  router.get('/', async (req, res) => {
    const ticket = await findVisibleTicket(prisma, req.user!, ticketIdOf(req.params));
    const comments = await prisma.comment.findMany({
      where: { ticketId: ticket.id },
      include: commentInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    res.json(comments.map(toCommentView));
  });

  router.post('/', async (req, res) => {
    const { body } = createCommentSchema.parse(req.body ?? {});
    const user = req.user!;
    const ticket = await findVisibleTicket(prisma, user, ticketIdOf(req.params));
    if (ticket.status === 'CERRADO') {
      throw conflict('No se puede comentar un ticket cerrado', { currentStatus: ticket.status });
    }

    const comment = await prisma.comment.create({
      data: { body, ticketId: ticket.id, authorId: user.id },
      include: commentInclude,
    });
    res.status(201).json(toCommentView(comment));
  });

  return router;
}

function toCommentView(c: {
  id: number;
  body: string;
  createdAt: Date;
  author: { id: number; name: string; role: string };
}) {
  return { id: c.id, body: c.body, createdAt: c.createdAt, author: c.author };
}
