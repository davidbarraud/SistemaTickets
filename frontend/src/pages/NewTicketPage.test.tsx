import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../test/fetchMock';
import { makeTicket } from '../test/fixtures';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

describe('Formulario de nuevo ticket: prioridad y categoría', () => {
  it('ofrece la prioridad con "Media" preseleccionada y las cuatro opciones', () => {
    mockApi([]);
    renderApp('/tickets/nuevo', { as: users.ana });

    const group = screen.getByRole('radiogroup', { name: /prioridad/i });
    expect(group).toBeInTheDocument();
    for (const label of ['Baja', 'Media', 'Alta', 'Urgente']) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'Media' })).toBeChecked();
  });

  it('ofrece la categoría con las cinco opciones', () => {
    mockApi([]);
    renderApp('/tickets/nuevo', { as: users.ana });

    const select = screen.getByLabelText(/categoría/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'OTRO']);
    expect(select).toHaveValue('OTRO');
  });

  it('envía la prioridad y la categoría elegidas', async () => {
    const fetchSpy = mockApi([
      { method: 'POST', path: '/api/tickets', status: 201, body: makeTicket({ id: 9 }) },
      { path: '/api/tickets', body: [] },
    ]);
    renderApp('/tickets/nuevo', { as: users.ana });

    await userEvent.type(screen.getByLabelText(/título/i), 'Sin red');
    await userEvent.type(screen.getByLabelText(/descripción/i), 'No hay internet en contaduría');
    await userEvent.click(screen.getByRole('radio', { name: 'Urgente' }));
    await userEvent.selectOptions(screen.getByLabelText(/categoría/i), 'RED');
    await userEvent.click(screen.getByRole('button', { name: /crear ticket/i }));

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      title: 'Sin red',
      description: 'No hay internet en contaduría',
      priority: 'URGENTE',
      category: 'RED',
    });
  });

  it('deshabilita el botón mientras se envía', async () => {
    let release!: () => void;
    const pending = new Promise<void>((r) => (release = r));
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      await pending;
      return new Response(JSON.stringify(makeTicket()), { status: 201, headers: { 'Content-Type': 'application/json' } });
    });
    renderApp('/tickets/nuevo', { as: users.ana });

    await userEvent.type(screen.getByLabelText(/título/i), 'Algo');
    await userEvent.type(screen.getByLabelText(/descripción/i), 'Detalle');
    await userEvent.click(screen.getByRole('button', { name: /crear ticket/i }));

    expect(screen.getByRole('button', { name: /creando/i })).toBeDisabled();
    release();
  });

  it('muestra junto al campo un error 400 de la API sobre la prioridad', async () => {
    mockApi([
      {
        method: 'POST',
        path: '/api/tickets',
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: [{ field: 'priority', message: 'Prioridad inválida' }],
          },
        },
      },
    ]);
    renderApp('/tickets/nuevo', { as: users.ana });

    await userEvent.type(screen.getByLabelText(/título/i), 'Algo');
    await userEvent.type(screen.getByLabelText(/descripción/i), 'Detalle');
    await userEvent.click(screen.getByRole('button', { name: /crear ticket/i }));

    expect(await screen.findByText('Prioridad inválida')).toBeInTheDocument();
  });
});
