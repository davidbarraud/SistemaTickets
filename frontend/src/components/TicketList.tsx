import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Ticket } from '../api/types';
import { formatDate } from './format';
import { CategoryLabel, PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

/**
 * Listado responsive: tarjetas apiladas en celular y tabla (grilla con encabezados) desde `md:`.
 * Cada fila es un único link al detalle, así toda la fila es clickeable y accesible por teclado;
 * `actions` agrega botones por fila fuera del link.
 */
export function TicketList({
  tickets,
  showRequester = false,
  actions,
}: {
  tickets: Ticket[];
  showRequester?: boolean;
  actions?: (ticket: Ticket) => ReactNode;
}) {
  const cols = showRequester
    ? 'md:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem_6rem_9rem_9rem_7.5rem]'
    : 'md:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem_6rem_9rem_7.5rem]';
  const headers = ['Ticket', 'Estado', 'Prioridad', 'Categoría', ...(showRequester ? ['Solicitante'] : []), 'Asignado', 'Creado'];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="hidden items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 md:flex">
        <div role="row" className={`grid flex-1 gap-4 ${cols}`}>
          {headers.map((h) => (
            <span key={h} role="columnheader" className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
              {h}
            </span>
          ))}
        </div>
        {actions && <span className="w-20 shrink-0" aria-hidden="true" />}
      </div>

      <ul className="divide-y divide-slate-100">
        {tickets.map((t) => (
          <li
            key={t.id}
            className={`group relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-brand-50/40 md:flex-row md:items-center md:gap-4 ${
              t.priority === 'URGENTE' && t.status !== 'CERRADO' ? 'border-l-4 border-l-red-500 pl-4' : ''
            }`}
          >
            <Link
              to={`/tickets/${t.id}`}
              className={`grid flex-1 grid-cols-[1fr_auto] gap-x-3 gap-y-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4 md:items-center md:gap-4 ${cols}`}
            >
              <span className="col-span-2 min-w-0 md:col-span-1">
                <span className="block truncate font-medium text-slate-900 transition-colors group-hover:text-brand-700">
                  {t.title}
                </span>
                <span className="text-xs text-slate-400">#{t.id}</span>
              </span>

              <span className="flex flex-wrap items-center gap-1.5 md:contents">
                <span>
                  <StatusBadge status={t.status} />
                </span>
                <span>
                  <PriorityBadge priority={t.priority} />
                </span>
                <span>
                  <CategoryLabel category={t.category} />
                </span>
              </span>

              {showRequester && (
                <span className="col-span-2 truncate text-sm text-slate-700 md:col-span-1" title={t.requester.email}>
                  <span className="text-slate-400 md:hidden">Solicitante: </span>
                  {t.requester.name}
                </span>
              )}
              <span className="col-span-2 truncate text-sm text-slate-700 md:col-span-1">
                <span className="text-slate-400 md:hidden">Asignado: </span>
                {t.assignee?.name ?? <span className="text-slate-400">Sin asignar</span>}
              </span>
              <span className="col-span-2 text-xs text-slate-500 md:col-span-1">{formatDate(t.createdAt)}</span>
            </Link>
            {actions && <div className="flex w-full shrink-0 justify-end gap-2 md:w-20">{actions(t)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
