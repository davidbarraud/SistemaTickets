import { clearSession, loadSession } from './session';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  /** Errores de validación por campo (si el backend los envió). */
  get fieldErrors(): FieldError[] {
    return Array.isArray(this.details) ? (this.details as FieldError[]) : [];
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Se suscribe al evento "la API respondió 401": la sesión ya no es válida. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

const LOGIN_PATH = '/api/auth/google';

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers = new Headers();
  const token = loadSession()?.token;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Un 401 en el login es una credencial inválida, no una sesión vencida.
    if (res.status === 401 && path !== LOGIN_PATH) {
      clearSession();
      unauthorizedListeners.forEach((l) => l());
    }
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? `Error ${res.status}`, err.details);
  }

  return data as T;
}
