import type { Prisma, PrismaClient, User } from '@prisma/client';
import { conflict, forbidden, notFound } from '../errors';
import { TRANSITIONS, type TicketAction } from './ticketStateMachine';
import { ticketInclude, toTicketView } from './ticketView';

/** Convierte el :id de la URL; ids inválidos se tratan como inexistentes (404). */
export function parseTicketId(raw: unknown): number {
  const id = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id <= 0) throw notFound('Ticket no encontrado');
  return id;
}

/** Un Solicitante solo puede ver sus propios tickets; un Operador ve todos. */
export function canSee(user: User, ticket: { requesterId: number }): boolean {
  return user.role === 'OPERADOR' || ticket.requesterId === user.id;
}

/** Busca un ticket visible para el usuario; si no existe o es ajeno, lanza 404. */
export async function findVisibleTicket(prisma: PrismaClient, user: User, ticketId: number) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketInclude });
  if (!ticket || !canSee(user, ticket)) throw notFound('Ticket no encontrado');
  return ticket;
}

/**
 * Aplica una transición con un único UPDATE condicional (status de origen + condición extra),
 * de modo que dos requests concurrentes no puedan aplicarla ambas.
 * Si no se actualizó ninguna fila, relee el ticket para devolver el error correcto:
 * 404 (no existe / ajeno), 409 (estado distinto) o 403 (no cumple la condición extra).
 */
export async function applyTransition(
  prisma: PrismaClient,
  user: User,
  ticketId: number,
  action: TicketAction,
  opts: { where?: Prisma.TicketWhereInput; data?: Prisma.TicketUncheckedUpdateManyInput } = {},
) {
  const { from, to } = TRANSITIONS[action];

  const { count } = await prisma.ticket.updateMany({
    where: { id: ticketId, status: from, ...opts.where },
    data: { status: to, ...opts.data },
  });

  const ticket = await findVisibleTicket(prisma, user, ticketId);

  if (count === 0) {
    if (ticket.status !== from) {
      throw conflict(`No se puede aplicar la acción sobre un ticket en estado ${ticket.status}`, {
        currentStatus: ticket.status,
      });
    }
    throw forbidden();
  }

  return toTicketView(ticket);
}
