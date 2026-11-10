import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { TICKET_STATUSES, type TicketStatus } from '../api/types';
import { STATUS_LABEL, STATUS_STYLE } from './StatusBadge';

export type StatusSummary = Record<TicketStatus, number>;

function isSummary(value: unknown): value is StatusSummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    TICKET_STATUSES.every((s) => typeof (value as Record<string, unknown>)[s] === 'number')
  );
}

/**
 * Conteo por estado desde `/api/tickets/summary`. Es información complementaria:
 * si falla o responde algo inesperado, se oculta en silencio sin afectar al listado.
 */
export function useStatusSummary() {
  const [summary, setSummary] = useState<StatusSummary | null>(null);
  const reload = useCallback(() => {
    apiFetch<unknown>('/api/tickets/summary')
      .then((data) => setSummary(isSummary(data) ? data : null))
      .catch(() => setSummary(null));
  }, []);
  return { summary, reload };
}

const ICON: Record<TicketStatus, string> = { ABIERTO: '●', EN_PROGRESO: '◐', RESUELTO: '✓', CERRADO: '■' };

export function SummaryCards({
  summary,
  active,
  onSelect,
}: {
  summary: StatusSummary | null;
  active?: TicketStatus | '';
  onSelect?: (status: TicketStatus | '') => void;
}) {
  if (!summary) return null;

  return (
    <section aria-label="Resumen por estado" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {TICKET_STATUSES.map((s) => {
        const pressed = active === s;
        const body = (
          <>
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{STATUS_LABEL[s]}</span>
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 place-items-center rounded-lg text-xs ring-1 ring-inset ${STATUS_STYLE[s].badge}`}
              >
                {ICON[s]}
              </span>
            </span>
            <span data-count className="mt-2 block text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
              {summary[s]}
            </span>
          </>
        );
        const base = 'block w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition';

        return onSelect ? (
          <button
            key={s}
            type="button"
            data-summary-card
            aria-pressed={pressed}
            onClick={() => onSelect(pressed ? '' : s)}
            className={`${base} hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              pressed ? 'ring-2 ring-brand-500 bg-brand-50/40' : 'ring-slate-200/80 hover:ring-slate-300'
            }`}
          >
            {body}
          </button>
        ) : (
          <div key={s} data-summary-card className={`${base} ring-slate-200/80`}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
