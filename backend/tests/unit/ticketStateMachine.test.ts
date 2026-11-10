import type { TicketStatus } from '@prisma/client';
import { TRANSITIONS, canApply, type TicketAction } from '../../src/tickets/ticketStateMachine';

const ALL: TicketStatus[] = ['ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'];

describe('ticketStateMachine', () => {
  it.each<[TicketAction, TicketStatus, TicketStatus, 'OPERADOR' | 'SOLICITANTE']>([
    ['take', 'ABIERTO', 'EN_PROGRESO', 'OPERADOR'],
    ['resolve', 'EN_PROGRESO', 'RESUELTO', 'OPERADOR'],
    ['close', 'RESUELTO', 'CERRADO', 'SOLICITANTE'],
  ])('%s: va de %s a %s y lo ejecuta %s', (action, from, to, role) => {
    expect(TRANSITIONS[action]).toEqual({ from, to, role });
  });

  it.each<[TicketAction, TicketStatus]>([
    ['take', 'ABIERTO'],
    ['resolve', 'EN_PROGRESO'],
    ['close', 'RESUELTO'],
  ])('%s solo se puede aplicar desde %s', (action, allowed) => {
    for (const status of ALL) {
      expect(canApply(action, status)).toBe(status === allowed);
    }
  });

  it('CERRADO es final: ninguna acción se puede aplicar', () => {
    for (const action of Object.keys(TRANSITIONS) as TicketAction[]) {
      expect(canApply(action, 'CERRADO')).toBe(false);
    }
  });
});
