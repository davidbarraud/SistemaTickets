import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button, buttonClass } from './ui';

const ROLE_LABEL = { SOLICITANTE: 'Solicitante', OPERADOR: 'Operador' } as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Layout() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="sticky z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <nav aria-label="Principal" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-600/30 transition group-hover:scale-105"
            >
              MA
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">Mesa de Ayuda</span>
              <span className="hidden text-xs text-slate-500 sm:block">Soporte de Sistemas</span>
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {user.role === 'SOLICITANTE' && (
              <NavLink to="/tickets/nuevo" className={buttonClass('primary', 'sm')}>
                <span aria-hidden="true" className="text-base leading-none">+</span>
                <span>
                  Nuevo<span className="hidden sm:inline"> ticket</span>
                  <span className="sr-only sm:hidden"> ticket</span>
                </span>
              </NavLink>
            )}

            <div className="flex min-w-0 items-center gap-2.5 border-l border-slate-200 pl-2 sm:pl-4">
              {user.pictureUrl ? (
                <img
                  src={user.pictureUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  {initials(user.name)}
                </span>
              )}
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="max-w-40 truncate text-sm font-medium text-slate-900">{user.name}</p>
                <p
                  className={`text-xs font-medium ${user.role === 'OPERADOR' ? 'text-brand-600' : 'text-slate-500'}`}
                >
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} title="Cerrar sesión">
                <span aria-hidden="true">⎋</span>
                <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
