import type { TicketStatus, UserRole } from '@prisma/client';

export type TicketAction = 'take' | 'resolve' | 'close';

export interface Transition {
  from: TicketStatus;
  to: TicketStatus;
  role: UserRole;
}

/** Flujo lineal del MVP: ABIERTO -> EN_PROGRESO -> RESUELTO -> CERRADO (final). */
export const TRANSITIONS: Readonly<Record<TicketAction, Transition>> = {
  take: { from: 'ABIERTO', to: 'EN_PROGRESO', role: 'OPERADOR' },
  resolve: { from: 'EN_PROGRESO', to: 'RESUELTO', role: 'OPERADOR' },
  close: { from: 'RESUELTO', to: 'CERRADO', role: 'SOLICITANTE' },
};

export function canApply(action: TicketAction, status: TicketStatus): boolean {
  return TRANSITIONS[action].from === status;
}
