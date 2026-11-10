import type { UserRole } from '@prisma/client';

/**
 * Devuelve OPERADOR si el email figura en OPERATOR_EMAILS (lista separada por comas,
 * sin distinguir mayúsculas ni espacios), y SOLICITANTE en cualquier otro caso.
 */
export function resolveRole(email: string, operatorEmails: string | undefined): UserRole {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 'SOLICITANTE';
  const operators = (operatorEmails ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return operators.includes(normalized) ? 'OPERADOR' : 'SOLICITANTE';
}
