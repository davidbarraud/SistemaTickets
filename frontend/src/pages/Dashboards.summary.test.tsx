import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../test/fetchMock';
import { makeTicket } from '../test/fixtures';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

const summary = { ABIERTO: 2, EN_PROGRESO: 0, RESUELTO: 1, CERRADO: 0 };

/** Cantidad que muestra la tarjeta de resumen de un estado. */
const cardCount = (region: HTMLElement, label: string) =>
  within(region).getByText(label).closest('[data-summary-card]')!.querySelector('[data-count]')!.textContent;

describe('Panel del Solicitante (rediseño)', () => {
  it('muestra tarjetas de resumen con los conteos de /api/tickets/summary', async () => {
    mockApi([
      { path: '/api/tickets', body: [makeTicket({ title: 'Uno' })] },
      { path: '/api/tickets/summary', body: summary },
    ]);
    renderApp('/', { as: users.ana });

    const region = await screen.findByRole('region', { name: /resumen por estado/i });
    await waitFor(() => expect(cardCount(region, 'Abierto')).toBe('2'));
    expect(cardCount(region, 'En progreso')).toBe('0');
    expect(cardCount(region, 'Resuelto')).toBe('1');
    expect(cardCount(region, 'Cerrado')).toBe('0');
    // En el panel del Solicitante las tarjetas son informativas, no filtros.
    expect(within(region).queryByRole('button')).not.toBeInTheDocument();
  });

  it('el listado muestra la prioridad de cada ticket', async () => {
    mockApi([
      { path: '/api/tickets', body: [makeTicket({ title: 'Servidor', priority: 'URGENTE' })] },
      { path: '/api/tickets/summary', body: summary },
    ]);
    renderApp('/', { as: users.ana });

    expect(within(await screen.findByRole('link', { name: /servidor/i })).getByText('Urgente')).toBeInTheDocument();
  });

  it('sin tickets invita a crear el primero', async () => {
    mockApi([
      { path: '/api/tickets', body: [] },
      { path: '/api/tickets/summary', body: { ABIERTO: 0, EN_PROGRESO: 0, RESUELTO: 0, CERRADO: 0 } },
    ]);
    renderApp('/', { as: users.ana });

    expect(await screen.findByText(/todavía no creaste tickets/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear mi primer ticket/i })).toHaveAttribute('href', '/tickets/nuevo');
  });

  it('si el resumen falla, el listado se muestra igual y sin alertas', async () => {
    mockApi([{ path: '/api/tickets', body: [makeTicket({ title: 'Uno' })] }]);
    renderApp('/', { as: users.ana });

    expect(await screen.findByRole('link', { name: /uno/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Panel del Operador (rediseño)', () => {
  it('las tarjetas de resumen fijan el filtro de estado', async () => {
    const fetchSpy = mockApi([
      { path: /^\/api\/tickets(\?.*)?$/, body: [] },
      { path: '/api/tickets/summary', body: { ...summary, EN_PROGRESO: 3 } },
    ]);
    renderApp('/', { as: users.op1 });

    const region = await screen.findByRole('region', { name: /resumen por estado/i });
    const card = await within(region).findByRole('button', { name: /en progreso/i });
    expect(card).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(card);

    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/filtrar por estado/i)).toHaveValue('EN_PROGRESO');
    await waitFor(() => expect(fetchSpy.mock.calls.map(([u]) => u)).toContain('/api/tickets?status=EN_PROGRESO'));

    // Volver a elegirla quita el filtro.
    await userEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText(/filtrar por estado/i)).toHaveValue('');
  });

  it('el filtro de prioridad y el orden por prioridad cambian la consulta', async () => {
    const fetchSpy = mockApi([
      { path: /^\/api\/tickets(\?.*)?$/, body: [] },
      { path: '/api/tickets/summary', body: summary },
    ]);
    renderApp('/', { as: users.op1 });
    await screen.findByRole('heading', { name: /todos los tickets/i });

    await userEvent.selectOptions(screen.getByLabelText(/filtrar por estado/i), 'ABIERTO');
    await userEvent.selectOptions(screen.getByLabelText(/filtrar por prioridad/i), 'URGENTE');
    await userEvent.selectOptions(screen.getByLabelText(/ordenar por/i), 'priority');

    await waitFor(() =>
      expect(fetchSpy.mock.calls.map(([u]) => u)).toContain('/api/tickets?status=ABIERTO&priority=URGENTE&sort=priority'),
    );
  });

  it('muestra los tickets en el orden que devuelve la API', async () => {
    mockApi([
      { path: '/api/tickets', body: [] },
      {
        path: '/api/tickets?sort=priority',
        body: [
          makeTicket({ title: 'Primero urgente', priority: 'URGENTE' }),
          makeTicket({ title: 'Después baja', priority: 'BAJA' }),
        ],
      },
      { path: '/api/tickets/summary', body: summary },
    ]);
    renderApp('/', { as: users.op1 });
    await screen.findByRole('heading', { name: /todos los tickets/i });

    await userEvent.selectOptions(screen.getByLabelText(/ordenar por/i), 'priority');

    const links = await screen.findAllByRole('link', { name: /primero urgente|después baja/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Primero urgente');
    expect(links[1]).toHaveTextContent('Después baja');
  });
});
