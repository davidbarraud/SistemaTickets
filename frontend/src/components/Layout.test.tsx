import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadSession } from '../api/session';
import { mockApi } from '../test/fetchMock';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

const apiVacia = () =>
  mockApi([
    { path: /^\/api\/tickets(\?.*)?$/, body: [] },
    { path: '/api/tickets/summary', body: { ABIERTO: 0, EN_PROGRESO: 0, RESUELTO: 0, CERRADO: 0 } },
  ]);

describe('Barra de navegación', () => {
  it('Solicitante: nombre de la app al panel, acceso "Nuevo ticket", nombre y rol', async () => {
    apiVacia();
    renderApp('/', { as: users.ana });

    const nav = await screen.findByRole('navigation', { name: /principal/i });
    expect(within(nav).getByRole('link', { name: /mesa de ayuda/i })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: /nuevo ticket/i })).toHaveAttribute('href', '/tickets/nuevo');
    expect(within(nav).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(nav).getByText('Solicitante')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('Operador: sin "Nuevo ticket", con nombre, rol y cerrar sesión', async () => {
    apiVacia();
    renderApp('/', { as: users.op1 });

    const nav = await screen.findByRole('navigation', { name: /principal/i });
    expect(within(nav).queryByRole('link', { name: /nuevo ticket/i })).not.toBeInTheDocument();
    expect(within(nav).getByText('Op Uno')).toBeInTheDocument();
    expect(within(nav).getByText('Operador')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('la barra se mantiene en otras pantallas (detalle)', async () => {
    mockApi([
      { path: '/api/tickets/5', status: 404, body: { error: { code: 'NOT_FOUND', message: 'no' } } },
      { path: '/api/tickets/5/comments', status: 404, body: { error: { code: 'NOT_FOUND', message: 'no' } } },
    ]);
    renderApp('/tickets/5', { as: users.ana });

    expect(await screen.findByRole('navigation', { name: /principal/i })).toBeInTheDocument();
  });

  it('cerrar sesión limpia la sesión y lleva a /login', async () => {
    apiVacia();
    renderApp('/', { as: users.ana });

    const nav = await screen.findByRole('navigation', { name: /principal/i });
    await userEvent.click(within(nav).getByRole('button', { name: /cerrar sesión/i }));

    expect(await screen.findByText(/ingresá con tu cuenta de google/i)).toBeInTheDocument();
    expect(loadSession()).toBeNull();
  });
});
