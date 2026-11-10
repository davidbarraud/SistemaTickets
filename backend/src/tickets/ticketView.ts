import type { Prisma } from '@prisma/client';

const userSummary = { select: { id: true, name: true, email: true } } as const;

/** Relaciones que se cargan siempre para devolver un ticket. */
export const ticketInclude = {
  requester: userSummary,
  assignee: userSummary,
} satisfies Prisma.TicketInclude;

export type TicketWithPeople = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

/** Representación pública de un ticket en la API. */
export function toTicketView(t: TicketWithPeople) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    requester: t.requester,
    assignee: t.assignee,
    resolutionNote: t.resolutionNote,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    startedAt: t.startedAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
  };
}
