import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../api/client';
import { TICKET_PRIORITIES, type Comment, type Ticket, type TicketPriority, type User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../components/format';
import { CategoryLabel, PRIORITY_LABEL, PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Button, Card, ErrorMessage, Spinner, inputClass } from '../components/ui';

const ROLE_LABEL = { SOLICITANTE: 'Solicitante', OPERADOR: 'Operador' } as const;

const textareaClass = inputClass;

export function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<Ticket>(`/api/tickets/${id}`), apiFetch<Comment[]>(`/api/tickets/${id}/comments`)])
      .then(([t, c]) => {
        setTicket(t);
        setComments(c);
      })
      .catch((e) =>
        setLoadError(e instanceof ApiError && e.status === 404 ? 'Ticket no encontrado' : (e as Error).message),
      );
  }, [id]);

  async function runAction(path: string, body?: unknown) {
    setBusy(true);
    setActionError(null);
    try {
      setTicket(await apiFetch<Ticket>(path, { method: 'POST', body }));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  async function changePriority(priority: TicketPriority) {
    setBusy(true);
    setActionError(null);
    try {
      setTicket(await apiFetch<Ticket>(`/api/tickets/${id}/priority`, { method: 'PATCH', body: { priority } }));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo cambiar la prioridad');
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <section className="space-y-4">
        <BackLink />
        <ErrorMessage>{loadError}</ErrorMessage>
      </section>
    );
  }
  if (!ticket || !user) return <Spinner label="Cargando ticket…" />;

  return (
    <section className="space-y-6">
      <BackLink />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">#{ticket.id}</span>
        </div>
        <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{ticket.title}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card title="Descripción">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{ticket.description}</p>
          </Card>

          {ticket.resolutionNote && (
            <Card title="Nota de resolución" tone="success">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{ticket.resolutionNote}</p>
            </Card>
          )}

          <TicketActions ticket={ticket} user={user} busy={busy} onAction={runAction} />
          {actionError && <ErrorMessage>{actionError}</ErrorMessage>}

          <Comments ticket={ticket} comments={comments} onAdded={(c) => setComments((list) => [...list, c])} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <dl
            aria-label="Datos del ticket"
            className="divide-y divide-slate-100 rounded-2xl bg-white px-5 py-2 text-sm shadow-sm ring-1 ring-slate-200/80"
          >
            <Field label="Prioridad">
              <PriorityBadge priority={ticket.priority} />
            </Field>
            <Field label="Categoría">
              <CategoryLabel category={ticket.category} />
            </Field>
            <Field label="Solicitante">
              <span title={ticket.requester.email}>{ticket.requester.name}</span>
            </Field>
            <Field label="Asignado">
              {ticket.assignee ? (
                <span title={ticket.assignee.email}>{ticket.assignee.name}</span>
              ) : (
                <span className="text-slate-400">Sin asignar</span>
              )}
            </Field>
            <Field label="Creado">{formatDate(ticket.createdAt)}</Field>
            <Field label="Tomado">{formatDate(ticket.startedAt)}</Field>
            <Field label="Resolución">{formatDate(ticket.resolvedAt)}</Field>
            <Field label="Cierre">{formatDate(ticket.closedAt)}</Field>
          </dl>

          {user.role === 'OPERADOR' && ticket.status !== 'CERRADO' && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
              <label htmlFor="priority-select" className="block text-sm font-semibold text-slate-900">
                Cambiar prioridad
              </label>
              <p className="mt-0.5 text-xs text-slate-500">Solo visible para Operadores.</p>
              <select
                id="priority-select"
                value={ticket.priority}
                disabled={busy}
                onChange={(e) => void changePriority(e.target.value as TicketPriority)}
                className={`mt-3 ${inputClass}`}
              >
                {[...TICKET_PRIORITIES].reverse().map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-600">
      <span aria-hidden="true">←</span> Volver
    </Link>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

/** Acciones de cambio de estado: solo se muestran las permitidas para el rol y el estado. */
function TicketActions({
  ticket,
  user,
  busy,
  onAction,
}: {
  ticket: Ticket;
  user: User;
  busy: boolean;
  onAction: (path: string, body?: unknown) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const base = `/api/tickets/${ticket.id}`;

  if (user.role === 'OPERADOR' && ticket.status === 'ABIERTO') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-brand-50/60 p-5 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-700">Este ticket está esperando que un operador lo tome.</p>
        <Button disabled={busy} onClick={() => onAction(`${base}/take`)}>
          Tomar ticket
        </Button>
      </div>
    );
  }

  if (user.role === 'OPERADOR' && ticket.status === 'EN_PROGRESO' && ticket.assignee?.id === user.id) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const resolutionNote = note.trim();
      if (!resolutionNote) {
        setNoteError('La nota de resolución es obligatoria');
        return;
      }
      setNoteError(null);
      void onAction(`${base}/resolve`, { resolutionNote });
    };
    return (
      <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <label htmlFor="resolutionNote" className="block text-sm font-semibold text-slate-900">
          Nota de resolución
        </label>
        <textarea
          id="resolutionNote"
          rows={3}
          maxLength={5000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="¿Qué se hizo para resolverlo?"
          className={textareaClass}
        />
        {noteError && <p className="text-xs text-red-600">{noteError}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            Marcar como resuelto
          </Button>
        </div>
      </form>
    );
  }

  if (user.role === 'SOLICITANTE' && ticket.status === 'RESUELTO' && ticket.requester.id === user.id) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-emerald-900">El operador marcó este ticket como resuelto. ¿Se solucionó tu problema?</p>
        <Button disabled={busy} onClick={() => onAction(`${base}/close`)}>
          Confirmar cierre
        </Button>
      </div>
    );
  }

  return null;
}

function Comments({
  ticket,
  comments,
  onAdded,
}: {
  ticket: Ticket;
  comments: Comment[];
  onAdded: (c: Comment) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) {
      setError('El comentario no puede estar vacío');
      return;
    }
    setError(null);
    setSending(true);
    try {
      onAdded(await apiFetch<Comment>(`/api/tickets/${ticket.id}/comments`, { method: 'POST', body: { body } }));
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el comentario');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Comentarios</h2>

      {comments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Todavía no hay comentarios.
        </p>
      ) : (
        <ul aria-label="Comentarios" className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-[0.65rem] font-semibold text-slate-700"
                >
                  {c.author.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="font-medium text-slate-900">{c.author.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 ${c.author.role === 'OPERADOR' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {ROLE_LABEL[c.author.role]}
                </span>
                <span className="text-slate-400">{formatDate(c.createdAt)}</span>
              </div>
              {/* Se renderiza como texto: React escapa el contenido, nunca se interpreta HTML. */}
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {ticket.status === 'CERRADO' ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          El ticket está cerrado; ya no admite comentarios.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-2">
          <label htmlFor="newComment" className="sr-only">
            Nuevo comentario
          </label>
          <textarea
            id="newComment"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí un comentario…"
            className={textareaClass}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={sending}>
              {sending ? 'Enviando…' : 'Comentar'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
