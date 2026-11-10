export type Role = 'SOLICITANTE' | 'OPERADOR';
export type TicketStatus = 'ABIERTO' | 'EN_PROGRESO' | 'RESUELTO' | 'CERRADO';

export const TICKET_STATUSES: TicketStatus[] = ['ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'];

export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export const TICKET_PRIORITIES: TicketPriority[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

export type TicketCategory = 'HARDWARE' | 'SOFTWARE' | 'RED' | 'ACCESOS' | 'OTRO';
export const TICKET_CATEGORIES: TicketCategory[] = ['HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'OTRO'];

export interface User {
  id: number;
  email: string;
  name: string;
  pictureUrl: string | null;
  role: Role;
}

export interface Session {
  token: string;
  user: User;
}

export interface PersonSummary {
  id: number;
  name: string;
  email: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requester: PersonSummary;
  assignee: PersonSummary | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  author: { id: number; name: string; role: Role };
}
