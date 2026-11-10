import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../test/fetchMock';
import { makeTicket } from '../test/fixtures';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

describe('Dashboard del Solicitante', () => {
  it('muestra los tickets que devuelve la API con su estado', async () => {
    mockApi([
      {
        path: '/api/tickets',
        body: [
          makeTicket({ id: 1, title: 'No imprime', status: 'ABIERTO' }),
          makeTicket({ id: 2, title: 'Sin internet', status: 'EN_PROGRESO' }),
        ],
      },
    ]);
    renderApp('/', { as: users.ana });

    const first = await screen.findByRole('link', { name: /no imprime/i });
    expect(first).toHaveAttribute('href', '/tickets/1');
    expect(within(first).getByText('Abierto')).toBeInTheDocument();
    const second = screen.getByRole('link', { name: /sin internet/i });
    expect(within(second).getByText('En progreso')).toBeInTheDocument();
    expect(within(second).getByText(/op uno/i)).toBeInTheDocument();
  });

  it('tiene el botón "Nuevo ticket" y no muestra el filtro por estado', async () => {
    mockApi([{ path: '/api/tickets', body: [] }]);
    renderApp('/', { as: users.ana });

    expect(await screen.findByRole('link', { name: /nuevo ticket/i })).toHaveAttribute('href', '/tickets/nuevo');
    expect(screen.queryByLabelText(/filtrar por estado/i)).not.toBeInTheDocument();
  });

  it('sin tickets muestra un mensaje vacío', async () => {
    mockApi([{ path: '/api/tickets', body: [] }]);
    renderApp('/', { as: users.ana });

    expect(await screen.findByText(/todavía no creaste tickets/i)).toBeInTheDocument();
  });

  it('si la API falla muestra un error', async () => {
    mockApi([
      { path: '/api/tickets', status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Error interno' } } },
    ]);
    renderApp('/', { as: users.ana });

    expect(await screen.findByRole('alert')).toHaveTextContent(/error interno/i);
  });
});

describe('Formulario de nuevo ticket', () => {
  const fill = async (title: string, description: string) => {
    if (title) await userEvent.type(screen.getByLabelText(/título/i), title);
    if (description) await userEvent.type(screen.getByLabelText(/descripción/i), description);
    await userEvent.click(screen.getByRole('button', { name: /crear ticket/i }));
  };

  it('valida en el cliente que título y descripción no estén vacíos, sin llamar a la API', async () => {
    const fetchSpy = mockApi([]);
    renderApp('/tickets/nuevo', { as: users.ana });

    await fill('   ', '');

    expect(screen.getByText('El título es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La descripción es obligatoria')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('limita el título a 150 caracteres', () => {
    mockApi([]);
    renderApp('/tickets/nuevo', { as: users.ana });

    expect(screen.getByLabelText(/título/i)).toHaveAttribute('maxLength', '150');
  });

  it('crea el ticket con los datos sin espacios extra y vuelve al listado', async () => {
    const fetchSpy = mockApi([
      { method: 'POST', path: '/api/tickets', status: 201, body: makeTicket({ id: 42, title: 'No imprime' }) },
      { path: '/api/tickets', body: [makeTicket({ id: 42, title: 'No imprime' })] },
    ]);
    renderApp('/tickets/nuevo', { as: users.ana });

    await fill('  No imprime ', 'La impresora del 2do piso');

    expect(await screen.findByRole('link', { name: /no imprime/i })).toBeInTheDocument();
    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST')!;
    // ticket-classification: el formulario ahora también envía la prioridad y la categoría (por defecto MEDIA/OTRO).
    expect(post[1]?.body).toBe(
      JSON.stringify({ title: 'No imprime', description: 'La impresora del 2do piso', priority: 'MEDIA', category: 'OTRO' }),
    );
  });

  it('muestra los errores de validación que devuelve la API junto a cada campo', async () => {
    mockApi([
      {
        method: 'POST',
        path: '/api/tickets',
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: [{ field: 'description', message: 'Máximo 5000 caracteres' }],
          },
        },
      },
    ]);
    renderApp('/tickets/nuevo', { as: users.ana });

    await fill('Título', 'Descripción');

    expect(await screen.findByText('Máximo 5000 caracteres')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /nuevo ticket/i })).toBeInTheDocument();
  });

  it('un Operador que entra a /tickets/nuevo es redirigido al dashboard', async () => {
    mockApi([{ path: '/api/tickets', body: [] }]);
    renderApp('/tickets/nuevo', { as: users.op1 });

    expect(await screen.findByRole('heading', { name: /todos los tickets/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/título/i)).not.toBeInTheDocument();
  });
});
