import type { Ticket, TicketStatus } from '../api/types';
import { users } from './renderApp';

let nextId = 100;

const person = (u: { id: number; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email });

/** Ticket de ejemplo con los campos coherentes con su estado. */
export function makeTicket(overrides: Partial<Ticket> & { status?: TicketStatus } = {}): Ticket {
  const status = overrides.status ?? 'ABIERTO';
  const at = '2026-11-10T12:00:00.000Z';
  return {
    id: nextId++,
    title: `Ticket ${status}`,
    description: 'Descripción del problema',
    status,
    priority: 'MEDIA',
    category: 'OTRO',
    requester: person(users.ana),
    assignee: status === 'ABIERTO' ? null : person(users.op1),
    resolutionNote: status === 'RESUELTO' || status === 'CERRADO' ? 'Se resolvió' : null,
    createdAt: at,
    updatedAt: at,
    startedAt: status === 'ABIERTO' ? null : at,
    resolvedAt: status === 'RESUELTO' || status === 'CERRADO' ? at : null,
    closedAt: status === 'CERRADO' ? at : null,
    ...overrides,
  };
}
