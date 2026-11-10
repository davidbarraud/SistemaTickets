import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../test/fetchMock';
import { makeTicket } from '../test/fixtures';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

const juan = { id: users.juan.id, name: users.juan.name, email: users.juan.email };

describe('Dashboard del Operador', () => {
  it('muestra todos los tickets con el nombre del solicitante y sin botón "Nuevo ticket"', async () => {
    mockApi([
      {
        path: '/api/tickets',
        body: [makeTicket({ id: 1, title: 'De Ana' }), makeTicket({ id: 2, title: 'De Juan', requester: juan })],
      },
    ]);
    renderApp('/', { as: users.op1 });

    expect(await screen.findByRole('heading', { name: /todos los tickets/i })).toBeInTheDocument();
    expect(within(await screen.findByRole('link', { name: /de juan/i })).getByText('Juan Gómez')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /de ana/i })).getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /nuevo ticket/i })).not.toBeInTheDocument();
  });

  it('el filtro por estado cambia la consulta a la API', async () => {
    const fetchSpy = mockApi([
      { path: '/api/tickets', body: [makeTicket({ title: 'Abierto 1' }), makeTicket({ title: 'En curso', status: 'EN_PROGRESO' })] },
      { path: '/api/tickets?status=ABIERTO', body: [makeTicket({ title: 'Abierto 1' })] },
    ]);
    renderApp('/', { as: users.op1 });
    await screen.findByRole('link', { name: /en curso/i });

    await userEvent.selectOptions(screen.getByLabelText(/filtrar por estado/i), 'ABIERTO');

    await waitFor(() => expect(screen.queryByRole('link', { name: /en curso/i })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /abierto 1/i })).toBeInTheDocument();
    expect(fetchSpy.mock.calls.map(([url]) => url)).toContain('/api/tickets?status=ABIERTO');
  });

  it('la acción "Tomar" aparece solo en los tickets ABIERTO', async () => {
    mockApi([
      {
        path: '/api/tickets',
        body: [
          makeTicket({ id: 1, title: 'Uno', status: 'ABIERTO' }),
          makeTicket({ id: 2, title: 'Dos', status: 'EN_PROGRESO' }),
          makeTicket({ id: 3, title: 'Tres', status: 'RESUELTO' }),
          makeTicket({ id: 4, title: 'Cuatro', status: 'CERRADO' }),
        ],
      },
    ]);
    renderApp('/', { as: users.op1 });
    // Ancla al inicio: "Op Uno" (el operador asignado) también contiene "uno".
    await screen.findByRole('link', { name: /^uno\b/i });

    const takeButtons = screen.getAllByRole('button', { name: /tomar/i });
    expect(takeButtons).toHaveLength(1);
    expect(takeButtons[0]).toHaveAccessibleName('Tomar ticket #1');
  });

  it('al tomar un ticket llama a la API y actualiza su estado en la lista', async () => {
    const abierto = makeTicket({ id: 7, title: 'Pantalla negra' });
    const fetchSpy = mockApi([
      { path: '/api/tickets', body: [abierto] },
      {
        method: 'POST',
        path: '/api/tickets/7/take',
        body: { ...abierto, status: 'EN_PROGRESO', assignee: { id: users.op1.id, name: users.op1.name, email: users.op1.email } },
      },
    ]);
    renderApp('/', { as: users.op1 });

    await userEvent.click(await screen.findByRole('button', { name: 'Tomar ticket #7' }));

    const row = await screen.findByRole('link', { name: /pantalla negra/i });
    await waitFor(() => expect(within(row).getByText('En progreso')).toBeInTheDocument());
    expect(within(row).getByText('Op Uno')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tomar/i })).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url, init]) => url === '/api/tickets/7/take' && init?.method === 'POST')).toBe(true);
  });

  it('si otro Operador ya lo tomó (409) muestra el error y recarga la lista', async () => {
    const abierto = makeTicket({ id: 8, title: 'Mouse roto' });
    let listCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/api/tickets/8/take' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ error: { code: 'CONFLICT', message: 'No se puede aplicar la acción sobre un ticket en estado EN_PROGRESO' } }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }
      listCalls += 1;
      const body = listCalls === 1 ? [abierto] : [{ ...abierto, status: 'EN_PROGRESO', assignee: { id: 11, name: 'Op Dos', email: 'op2@test.org' } }];
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    renderApp('/', { as: users.op1 });

    await userEvent.click(await screen.findByRole('button', { name: 'Tomar ticket #8' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/en_progreso/i);
    const row = await screen.findByRole('link', { name: /mouse roto/i });
    await waitFor(() => expect(within(row).getByText('Op Dos')).toBeInTheDocument());
  });

  it('sin tickets para el filtro elegido muestra un mensaje vacío', async () => {
    mockApi([{ path: '/api/tickets', body: [] }]);
    renderApp('/', { as: users.op1 });

    expect(await screen.findByText(/no hay tickets/i)).toBeInTheDocument();
  });
});
