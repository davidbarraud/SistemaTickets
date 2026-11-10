import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/ui';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function handleCredential(credential?: string) {
    if (!credential) {
      setError('No se pudo iniciar sesión con Google. Intentá de nuevo.');
      return;
    }
    setError(null);
    try {
      await login(credential);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar con el servidor.');
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-white/15 font-bold ring-1 ring-white/25">MA</span>
        <div className="relative max-w-md space-y-4">
          <p className="text-3xl font-semibold leading-tight tracking-tight">Soporte de Sistemas, ordenado y a la vista.</p>
          <p className="text-brand-100">Creá tus pedidos, seguí su estado en tiempo real y conversá con el equipo de Sistemas en un solo lugar.</p>
        </div>
        <ul className="relative grid gap-3 text-sm text-brand-100">
          {['Prioridad y categoría para cada pedido', 'Seguimiento de estado de punta a punta', 'Comentarios entre Solicitante y Operador'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-xs">✓</span>
              {t}
            </li>
          ))}
        </ul>
      </aside>

      <main className="grid place-items-center bg-gradient-to-b from-white to-slate-100 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white shadow-md shadow-brand-600/30"
            >
              MA
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mesa de Ayuda</h1>
            <p className="mt-2 text-sm text-slate-500">Ingresá con tu cuenta de Google para crear y seguir tus pedidos de soporte.</p>

            <div className="mt-8 flex justify-center">
              <GoogleLogin
                onSuccess={(r) => handleCredential(r.credential)}
                onError={() => handleCredential(undefined)}
              />
            </div>

            {error && (
              <div className="mt-6 text-left">
                <ErrorMessage>{error}</ErrorMessage>
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">Acceso exclusivo para personal de la organización.</p>
        </div>
      </main>
    </div>
  );
}
