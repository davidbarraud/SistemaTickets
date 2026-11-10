import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { Ticket } from '../api/types';
import { SummaryCards, useStatusSummary } from '../components/SummaryCards';
import { TicketList } from '../components/TicketList';
import { EmptyState, ErrorMessage, PageHeader, Spinner, buttonClass } from '../components/ui';

export function RequesterDashboard() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { summary, reload: loadSummary } = useStatusSummary();

  // Primero el listado y después el resumen.
  useEffect(() => {
    apiFetch<Ticket[]>('/api/tickets')
      .then(setTickets)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(loadSummary, [loadSummary]);

  return (
    <section className="space-y-6">
      <PageHeader title="Mis tickets" subtitle="Seguí el estado de tus pedidos de soporte." />

      <SummaryCards summary={summary} />

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {!error && tickets === null && <Spinner label="Cargando tickets…" />}
      {tickets?.length === 0 && (
        <EmptyState
          action={
            <Link to="/tickets/nuevo" className={buttonClass('primary')}>
              Crear mi primer ticket
            </Link>
          }
        >
          Todavía no creaste tickets. Cuando tengas un problema con tu equipo, una aplicación o tus accesos, contanos y te
          ayudamos.
        </EmptyState>
      )}
      {tickets && tickets.length > 0 && <TicketList tickets={tickets} />}
    </section>
  );
}
