import type { TicketCategory, TicketPriority } from '../api/types';

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  RED: 'Red',
  ACCESOS: 'Accesos',
  OTRO: 'Otro',
};

const LEVEL: Record<TicketPriority, number> = { BAJA: 1, MEDIA: 2, ALTA: 3, URGENTE: 4 };

/** Intensidad creciente; Urgente es el único sólido, para destacarlo. */
const PRIORITY_STYLE: Record<TicketPriority, { badge: string; bar: string }> = {
  BAJA: { badge: 'bg-slate-50 text-slate-600 ring-slate-500/20', bar: 'bg-slate-400' },
  MEDIA: { badge: 'bg-blue-50 text-blue-700 ring-blue-600/20', bar: 'bg-blue-500' },
  ALTA: { badge: 'bg-orange-50 text-orange-700 ring-orange-600/25', bar: 'bg-orange-500' },
  URGENTE: { badge: 'bg-red-600 text-white ring-red-700 shadow-sm shadow-red-600/30', bar: 'bg-white' },
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const style = PRIORITY_STYLE[priority];
  const level = LEVEL[priority];
  return (
    <span
      data-badge
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
    >
      <span aria-hidden="true" className="flex h-3 items-end gap-px">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            data-bar={i <= level ? 'on' : 'off'}
            className={`w-0.5 rounded-sm ${i <= level ? style.bar : 'bg-current opacity-20'}`}
            style={{ height: `${i * 25}%` }}
          />
        ))}
      </span>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function CategoryLabel({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {CATEGORY_LABEL[category]}
    </span>
  );
}
