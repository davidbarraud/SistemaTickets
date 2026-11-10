import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { saveSession } from '../api/session';
import type { Role, User } from '../api/types';
import { AppRoutes } from '../AppRoutes';
import { AuthProvider } from '../auth/AuthContext';

export const users: Record<'ana' | 'juan' | 'op1' | 'op2', User> = {
  ana: { id: 1, email: 'ana@test.org', name: 'Ana Pérez', pictureUrl: null, role: 'SOLICITANTE' },
  juan: { id: 2, email: 'juan@test.org', name: 'Juan Gómez', pictureUrl: null, role: 'SOLICITANTE' },
  op1: { id: 10, email: 'op1@test.org', name: 'Op Uno', pictureUrl: null, role: 'OPERADOR' },
  op2: { id: 11, email: 'op2@test.org', name: 'Op Dos', pictureUrl: null, role: 'OPERADOR' },
};

/** Renderiza la app completa en la ruta indicada, opcionalmente con una sesión iniciada. */
export function renderApp(path: string, opts: { as?: User | Role } = {}) {
  if (opts.as) {
    const user = typeof opts.as === 'string' ? (opts.as === 'OPERADOR' ? users.op1 : users.ana) : opts.as;
    saveSession({ token: 'test-token', user });
  }
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}
