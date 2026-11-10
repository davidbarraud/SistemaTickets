import { Prisma, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { authenticate, requireRole } from '../auth/middleware';
import { conflict, notFound } from '../errors';
import { applyTransition, findVisibleTicket, parseTicketId } from './applyTransition';
import { ticketInclude, toTicketView } from './ticketView';

const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(150, 'Máximo 150 caracteres'),
  description: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(5000, 'Máximo 5000 caracteres'),
  priority: z.nativeEnum(TicketPriority, { message: 'Prioridad inválida' }).optional(),
  category: z.nativeEnum(TicketCategory, { message: 'Categoría inválida' }).optional(),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority, { message: 'Prioridad inválida' }).optional(),
  sort: z.enum(['priority'], { message: 'Orden inválido' }).optional(),
});

const priorityBodySchema = z.object({
  priority: z.nativeEnum(TicketPriority, { message: 'Prioridad inválida' }),
});

const resolveTicketSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(1, 'La nota de resolución es obligatoria')
    .max(5000, 'Máximo 5000 caracteres'),
});

export function ticketRoutes({ prisma, config }: AppDeps) {
  const router = Router();
  router.use(authenticate({ prisma, config }));

  /** Tickets que el usuario puede ver: el Solicitante, solo los suyos; el Operador, todos. */
  const visibleWhere = (user: Express.Request['user'] & object): Prisma.TicketWhereInput =>
    user.role === 'SOLICITANTE' ? { requesterId: user.id } : {};

  router.get('/', async (req, res) => {
    const { status, priority, sort } = listQuerySchema.parse(req.query);
    const user = req.user!;
    // El orden de declaración del enum TicketPriority (BAJA < ... < URGENTE) define este orden en MySQL.
    const byDate: Prisma.TicketOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];
    const tickets = await prisma.ticket.findMany({
      where: {
        ...visibleWhere(user),
        ...(status && { status }),
        ...(priority && { priority }),
      },
      include: ticketInclude,
      orderBy: sort === 'priority' ? [{ priority: 'desc' }, ...byDate] : byDate,
    });
    res.json(tickets.map(toTicketView));
  });

  router.post('/', requireRole('SOLICITANTE'), async (req, res) => {
    const data = createTicketSchema.parse(req.body ?? {});
    const ticket = await prisma.ticket.create({
      data: { ...data, requesterId: req.user!.id },
      include: ticketInclude,
    });
    res.status(201).json(toTicketView(ticket));
  });

  // Debe declararse antes de '/:id' para que esa ruta no la capture.
  router.get('/summary', async (req, res) => {
    const groups = await prisma.ticket.groupBy({
      by: ['status'],
      where: visibleWhere(req.user!),
      _count: { _all: true },
    });
    const summary = Object.fromEntries(Object.values(TicketStatus).map((s) => [s, 0])) as Record<TicketStatus, number>;
    for (const g of groups) summary[g.status] = g._count._all;
    res.json(summary);
  });

  router.get('/:id', async (req, res) => {
    const ticket = await findVisibleTicket(prisma, req.user!, parseTicketId(req.params.id));
    res.json(toTicketView(ticket));
  });

  router.post('/:id/take', requireRole('OPERADOR'), async (req, res) => {
    const id = parseTicketId(req.params.id);
    const user = req.user!;
    const view = await applyTransition(prisma, user, id, 'take', {
      data: { assigneeId: user.id, startedAt: new Date() },
    });
    res.json(view);
  });

  router.post('/:id/resolve', requireRole('OPERADOR'), async (req, res) => {
    const { resolutionNote } = resolveTicketSchema.parse(req.body ?? {});
    const id = parseTicketId(req.params.id);
    const user = req.user!;
    const view = await applyTransition(prisma, user, id, 'resolve', {
      where: { assigneeId: user.id },
      data: { resolutionNote, resolvedAt: new Date() },
    });
    res.json(view);
  });

  router.post('/:id/close', requireRole('SOLICITANTE'), async (req, res) => {
    const id = parseTicketId(req.params.id);
    const user = req.user!;
    const view = await applyTransition(prisma, user, id, 'close', {
      where: { requesterId: user.id },
      data: { closedAt: new Date() },
    });
    res.json(view);
  });

  router.patch('/:id/priority', requireRole('OPERADOR'), async (req, res) => {
    const { priority } = priorityBodySchema.parse(req.body ?? {});
    const id = parseTicketId(req.params.id);
    // Update condicional: nunca modifica un ticket CERRADO, aunque se cierre en paralelo.
    const { count } = await prisma.ticket.updateMany({
      where: { id, status: { not: TicketStatus.CERRADO } },
      data: { priority },
    });
    if (count === 0) {
      const exists = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
      if (!exists) throw notFound('Ticket no encontrado');
      throw conflict('No se puede cambiar la prioridad de un ticket CERRADO', { currentStatus: exists.status });
    }
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
    res.json(toTicketView(ticket));
  });

  return router;
}
