import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadSession } from '../api/session';
import { mockApi } from '../test/fetchMock';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

describe('Login y rutas protegidas', () => {
  it('sin sesión, cualquier ruta redirige a la pantalla de login', () => {
    renderApp('/tickets/5');

    expect(screen.getByRole('heading', { name: /mesa de ayuda/i })).toBeInTheDocument();
    expect(screen.getByText(/ingresá con tu cuenta de google/i)).toBeInTheDocument();
    expect(screen.queryByText(/mis tickets/i)).not.toBeInTheDocument();
  });

  it('login exitoso: intercambia la credencial y entra al dashboard', async () => {
    const fetchSpy = mockApi([
      { method: 'POST', path: '/api/auth/google', body: { token: 'tok', user: users.ana } },
      { path: '/api/tickets', body: [] },
    ]);
    renderApp('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Google (mock)' }));

    expect(await screen.findByRole('heading', { name: /mis tickets/i })).toBeInTheDocument();
    expect(fetchSpy.mock.calls[0][1]?.body).toBe(JSON.stringify({ credential: 'cred-de-google' }));
    expect(loadSession()?.user.email).toBe('ana@test.org');
  });

  it('si la API rechaza la credencial muestra un error y sigue en login', async () => {
    mockApi([
      {
        method: 'POST',
        path: '/api/auth/google',
        status: 401,
        body: { error: { code: 'UNAUTHORIZED', message: 'El email de Google no está verificado' } },
      },
    ]);
    renderApp('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Google (mock)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El email de Google no está verificado');
    expect(loadSession()).toBeNull();
  });

  it('si falla el popup de Google muestra un error', async () => {
    renderApp('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Google falla (mock)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo iniciar sesión con google/i);
  });

  it('con sesión iniciada, /login redirige al dashboard', async () => {
    mockApi([{ path: '/api/tickets', body: [] }]);
    renderApp('/login', { as: 'SOLICITANTE' });

    await waitFor(() => expect(screen.getByRole('heading', { name: /mis tickets/i })).toBeInTheDocument());
  });

  it('el encabezado muestra el usuario y permite cerrar sesión', async () => {
    mockApi([{ path: '/api/tickets', body: [] }]);
    renderApp('/', { as: users.ana });

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(screen.getByText(/ingresá con tu cuenta de google/i)).toBeInTheDocument();
    expect(loadSession()).toBeNull();
  });
});
