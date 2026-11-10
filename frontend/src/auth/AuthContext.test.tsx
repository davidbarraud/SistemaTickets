import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveSession, loadSession } from '../api/session';
import { jsonResponse, mockApi } from '../test/fetchMock';
import { AuthProvider, useAuth } from './AuthContext';

const ana = { id: 1, email: 'ana@test.org', name: 'Ana', pictureUrl: null, role: 'SOLICITANTE' as const };

function Probe() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <p>usuario: {user ? `${user.name} (${user.role})` : 'ninguno'}</p>
      <button onClick={() => login('cred-google')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthContext', () => {
  it('sin sesión guardada arranca sin usuario', () => {
    renderProbe();
    expect(screen.getByText('usuario: ninguno')).toBeInTheDocument();
  });

  it('restaura la sesión guardada en localStorage', () => {
    saveSession({ token: 'tok', user: ana });
    renderProbe();
    expect(screen.getByText('usuario: Ana (SOLICITANTE)')).toBeInTheDocument();
  });

  it('login envía la credencial a /api/auth/google y persiste la sesión', async () => {
    const fetchSpy = mockApi([
      { method: 'POST', path: '/api/auth/google', body: { token: 'nuevo-token', user: ana } },
    ]);
    renderProbe();

    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByText('usuario: Ana (SOLICITANTE)')).toBeInTheDocument());
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ credential: 'cred-google' }));
    expect(loadSession()).toEqual({ token: 'nuevo-token', user: ana });
  });

  it('logout borra la sesión', async () => {
    saveSession({ token: 'tok', user: ana });
    renderProbe();

    await userEvent.click(screen.getByText('logout'));

    expect(screen.getByText('usuario: ninguno')).toBeInTheDocument();
    expect(loadSession()).toBeNull();
  });

  it('cuando la API responde 401 se cierra la sesión en la interfaz', async () => {
    saveSession({ token: 'vencido', user: ana });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'vencida' } }, 401),
    );
    renderProbe();
    const { apiFetch } = await import('../api/client');

    await act(async () => {
      await apiFetch('/api/tickets').catch(() => undefined);
    });

    expect(screen.getByText('usuario: ninguno')).toBeInTheDocument();
  });
});
