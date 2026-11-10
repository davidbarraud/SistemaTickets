import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../../src/db';

/** Crea un ticket directamente en la base, en el estado indicado. */
export function seedTicket(opts: {
  requesterId: number;
  status?: TicketStatus;
  assigneeId?: number | null;
  title?: string;
  resolutionNote?: string | null;
  createdAt?: Date;
  priority?: TicketPriority;
  category?: TicketCategory;
}): Promise<Ticket> {
  const status = opts.status ?? 'ABIERTO';
  const now = new Date();
  return prisma.ticket.create({
    data: {
      title: opts.title ?? `Ticket ${status}`,
      description: 'Descripción de prueba',
      status,
      requesterId: opts.requesterId,
      assigneeId: opts.assigneeId ?? null,
      resolutionNote: opts.resolutionNote ?? null,
      createdAt: opts.createdAt,
      priority: opts.priority,
      category: opts.category,
      startedAt: status !== 'ABIERTO' ? now : null,
      resolvedAt: status === 'RESUELTO' || status === 'CERRADO' ? now : null,
      closedAt: status === 'CERRADO' ? now : null,
    },
  });
}
