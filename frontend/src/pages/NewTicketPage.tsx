import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiFetch } from '../api/client';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from '../api/types';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '../components/PriorityBadge';
import { Button, ErrorMessage, PageHeader, inputClass, labelClass } from '../components/ui';

type Field = 'title' | 'description' | 'priority' | 'category';
type Errors = Partial<Record<Field, string>>;

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;

const PRIORITY_HINT: Record<TicketPriority, string> = {
  BAJA: 'Puede esperar',
  MEDIA: 'Afecta mi trabajo',
  ALTA: 'Me impide trabajar',
  URGENTE: 'Afecta a varias personas',
};

const PRIORITY_CHECKED: Record<TicketPriority, string> = {
  BAJA: 'peer-checked:ring-slate-500 peer-checked:bg-slate-50',
  MEDIA: 'peer-checked:ring-blue-500 peer-checked:bg-blue-50',
  ALTA: 'peer-checked:ring-orange-500 peer-checked:bg-orange-50',
  URGENTE: 'peer-checked:ring-red-500 peer-checked:bg-red-50',
};

export function NewTicketPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIA');
  const [category, setCategory] = useState<TicketCategory>('OTRO');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data = { title: title.trim(), description: description.trim(), priority, category };

    const local: Errors = {};
    if (!data.title) local.title = 'El título es obligatorio';
    if (!data.description) local.description = 'La descripción es obligatoria';
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    setSending(true);
    try {
      await apiFetch<Ticket>('/api/tickets', { method: 'POST', body: data });
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        setErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message])));
      } else {
        setFormError(err instanceof Error ? err.message : 'No se pudo crear el ticket');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-600">
        <span aria-hidden="true">←</span> Volver a mis tickets
      </Link>

      <PageHeader title="Nuevo ticket" subtitle="Contanos qué necesitás. El equipo de Sistemas lo va a tomar a la brevedad." />

      <form onSubmit={handleSubmit} noValidate className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="space-y-6 p-6">
          <FormField id="title" label="Título" error={errors.title} counter={`${title.length}/${TITLE_MAX}`}>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Ej.: No funciona la impresora del 2do piso"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className={inputClass}
            />
          </FormField>

          <FormField id="description" label="Descripción" error={errors.description}>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={6}
              placeholder="Contanos qué pasa, desde cuándo y qué probaste."
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              className={inputClass}
            />
          </FormField>

          <div className="grid gap-6 md:grid-cols-[1fr_14rem]">
            <fieldset>
              <legend id="priority-label" className={labelClass}>
                Prioridad
              </legend>
              <div role="radiogroup" aria-labelledby="priority-label" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TICKET_PRIORITIES.map((p) => (
                  <label key={p} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex h-full flex-col rounded-xl px-3 py-2.5 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 peer-checked:ring-2 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 ${PRIORITY_CHECKED[p]}`}
                    >
                      <span className="text-sm font-semibold text-slate-900">{PRIORITY_LABEL[p]}</span>
                      <span aria-hidden="true" className="text-xs text-slate-500">
                        {PRIORITY_HINT[p]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {errors.priority && <p className="mt-1.5 text-xs text-red-600">{errors.priority}</p>}
            </fieldset>

            <FormField id="category" label="Categoría" error={errors.category}>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className={inputClass}
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {formError && <ErrorMessage>{formError}</ErrorMessage>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Cancelar
          </Link>
          <Button type="submit" disabled={sending}>
            {sending ? 'Creando…' : 'Crear ticket'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function FormField({
  id,
  label,
  error,
  counter,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      <div className="mt-1.5 flex justify-between gap-3 text-xs">
        <span id={`${id}-error`} className="text-red-600">
          {error}
        </span>
        {counter && <span className="text-slate-400">{counter}</span>}
      </div>
    </div>
  );
}
