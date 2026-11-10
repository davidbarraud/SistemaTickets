import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '../api/client';
import { TICKET_PRIORITIES, TICKET_STATUSES, type Ticket, type TicketPriority, type TicketStatus } from '../api/types';
import { PRIORITY_LABEL } from '../components/PriorityBadge';
import { STATUS_LABEL } from '../components/StatusBadge';
import { SummaryCards, useStatusSummary } from '../components/SummaryCards';
import { TicketList } from '../components/TicketList';
import { Button, EmptyState, ErrorMessage, PageHeader, Spinner, inputClass } from '../components/ui';

type Sort = '' | 'priority';

export function OperatorDashboard() {
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [sort, setSort] = useState<Sort>('');
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<number | null>(null);
  const { summary, reload: loadSummary } = useStatusSummary();

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (sort) params.set('sort', sort);
    const query = params.size > 0 ? `?${params}` : '';
    return apiFetch<Ticket[]>(`/api/tickets${query}`)
      .then(setTickets)
      .catch((e: Error) => setError(e.message));
  }, [status, priority, sort]);

  // Primero el listado y después el resumen.
  useEffect(() => {
    setError(null);
    void load();
  }, [load]);
  useEffect(loadSummary, [loadSummary]);

  async function take(ticket: Ticket) {
    setTakingId(ticket.id);
    setError(null);
    try {
      const updated = await apiFetch<Ticket>(`/api/tickets/${ticket.id}/take`, { method: 'POST' });
      // Si hay un filtro activo y el ticket ya no cumple, se quita de la lista.
      setTickets((list) =>
        (list ?? [])
          .map((t) => (t.id === updated.id ? updated : t))
          .filter((t) => !status || t.status === status),
      );
      loadSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo tomar el ticket');
      await load();
    } finally {
      setTakingId(null);
    }
  }

  const hasFilters = status !== '' || priority !== '' || sort !== '';

  return (
    <section className="space-y-6">
      <PageHeader title="Todos los tickets" subtitle="Panel de gestión de la mesa de ayuda." />

      <SummaryCards summary={summary} active={status} onSelect={setStatus} />

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:flex-wrap sm:items-end">
        <FilterField label="Filtrar por estado">
          <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | '')} className={inputClass}>
            <option value="">Todos</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Filtrar por prioridad">
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | '')} className={inputClass}>
            <option value="">Todas</option>
            {[...TICKET_PRIORITIES].reverse().map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Ordenar por">
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={inputClass}>
            <option value="">Más recientes</option>
            <option value="priority">Prioridad</option>
          </select>
        </FilterField>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="sm:ml-auto"
            onClick={() => {
              setStatus('');
              setPriority('');
              setSort('');
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {tickets === null && !error && <Spinner label="Cargando tickets…" />}
      {tickets?.length === 0 && <EmptyState>No hay tickets para mostrar con estos filtros.</EmptyState>}
      {tickets && tickets.length > 0 && (
        <TicketList
          tickets={tickets}
          showRequester
          actions={(t) =>
            t.status === 'ABIERTO' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => take(t)}
                disabled={takingId === t.id}
                aria-label={`Tomar ticket #${t.id}`}
              >
                {takingId === t.id ? 'Tomando…' : 'Tomar'}
              </Button>
            )
          }
        />
      )}
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-slate-500 sm:max-w-52">
      {label}
      {children}
    </label>
  );
}
