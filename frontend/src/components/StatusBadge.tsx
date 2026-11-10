import type { TicketStatus } from '../api/types';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  ABIERTO: 'Abierto',
  EN_PROGRESO: 'En progreso',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
};

/** Fondo, texto y anillo del badge, y color del punto indicador. */
export const STATUS_STYLE: Record<TicketStatus, { badge: string; dot: string }> = {
  ABIERTO: { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  EN_PROGRESO: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500 animate-pulse' },
  RESUELTO: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  CERRADO: { badge: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      data-badge
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span data-indicator aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
