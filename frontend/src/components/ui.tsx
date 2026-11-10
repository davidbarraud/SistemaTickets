import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* ------------------------------------------------------------------ *
 * Primitivas visuales compartidas (design §4). Las páginas componen  *
 * estas piezas en lugar de repetir cadenas largas de clases.         *
 * ------------------------------------------------------------------ */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-55 active:translate-y-px';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/25',
  secondary: 'bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

/** Clases de botón, también para `<Link>` que se ve como botón. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]}`;
}

export const buttonPrimary = buttonClass('primary');
export const buttonSecondary = buttonClass('secondary', 'sm');

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function Card({
  title,
  actions,
  tone = 'default',
  className = '',
  children,
}: {
  title?: string;
  actions?: ReactNode;
  tone?: 'default' | 'success';
  className?: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'success' ? 'bg-emerald-50/70 ring-emerald-200' : 'bg-white ring-slate-200/80';
  return (
    <section className={`rounded-2xl p-5 shadow-sm ring-1 ${toneClass} ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
      />
      <span>{label}</span>
    </div>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
      <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-xl text-brand-600">
        ✓
      </span>
      <p className="max-w-sm text-sm text-slate-500">{children}</p>
      {action}
    </div>
  );
}

/** Estilo común de inputs, selects y textareas. */
export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 ' +
  'placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50';

export const labelClass = 'block text-sm font-medium text-slate-700';
