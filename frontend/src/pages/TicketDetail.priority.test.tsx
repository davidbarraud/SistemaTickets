import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Ticket } from '../api/types';
import { mockApi } from '../test/fetchMock';
import { makeTicket } from '../test/fixtures';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

const op1 = { id: users.op1.id, name: users.op1.name, email: users.op1.email };

function mockTicket(ticket: Ticket, extra: Parameters<typeof mockApi>[0] = []) {
  return mockApi([
    { path: `/api/tickets/${ticket.id}`, body: ticket },
    { path: `/api/tickets/${ticket.id}/comments`, body: [] },
    ...extra,
  ]);
}

describe('Detalle: prioridad y categoría', () => {
  it('muestra la prioridad y la categoría en los datos del ticket', async () => {
    mockTicket(makeTicket({ id: 40, priority: 'ALTA', category: 'HARDWARE' }));
    renderApp('/tickets/40', { as: users.ana });

    await screen.findByRole('heading', { level: 1 });
    const datos = screen.getByLabelText('Datos del ticket');
    expect(within(datos).getByText('Alta')).toBeInTheDocument();
    expect(within(datos).getByText('Hardware')).toBeInTheDocument();
  });

  it('el Solicitante no ve el control para cambiar la prioridad', async () => {
    mockTicket(makeTicket({ id: 41, status: 'EN_PROGRESO', assignee: op1 }));
    renderApp('/tickets/41', { as: users.ana });

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByLabelText(/cambiar prioridad/i)).not.toBeInTheDocument();
  });

  it.each(['ABIERTO', 'EN_PROGRESO', 'RESUELTO'] as const)('el Operador ve el control en %s', async (status) => {
    mockTicket(makeTicket({ id: 42, status, priority: 'MEDIA' }));
    renderApp('/tickets/42', { as: users.op1 });

    expect(await screen.findByLabelText(/cambiar prioridad/i)).toHaveValue('MEDIA');
  });

  it('el Operador no ve el control en un ticket CERRADO', async () => {
    mockTicket(makeTicket({ id: 43, status: 'CERRADO' }));
    renderApp('/tickets/43', { as: users.op1 });

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByLabelText(/cambiar prioridad/i)).not.toBeInTheDocument();
  });

  it('al cambiarla hace PATCH y actualiza el badge', async () => {
    const t = makeTicket({ id: 44, status: 'EN_PROGRESO', assignee: op1, priority: 'MEDIA' });
    const fetchSpy = mockTicket(t, [
      { method: 'PATCH', path: '/api/tickets/44/priority', body: { ...t, priority: 'URGENTE' } },
    ]);
    renderApp('/tickets/44', { as: users.op1 });

    await userEvent.selectOptions(await screen.findByLabelText(/cambiar prioridad/i), 'URGENTE');

    const datos = screen.getByLabelText('Datos del ticket');
    await waitFor(() => expect(within(datos).getByText('Urgente')).toBeInTheDocument());
    const patch = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
    expect(patch[0]).toBe('/api/tickets/44/priority');
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ priority: 'URGENTE' });
  });

  it('si la API rechaza el cambio muestra el error y conserva la prioridad', async () => {
    const t = makeTicket({ id: 45, status: 'RESUELTO', priority: 'BAJA' });
    mockTicket(t, [
      {
        method: 'PATCH',
        path: '/api/tickets/45/priority',
        status: 409,
        body: { error: { code: 'CONFLICT', message: 'El ticket está cerrado' } },
      },
    ]);
    renderApp('/tickets/45', { as: users.op1 });

    await userEvent.selectOptions(await screen.findByLabelText(/cambiar prioridad/i), 'ALTA');

    expect(await screen.findByRole('alert')).toHaveTextContent('El ticket está cerrado');
    expect(screen.getByLabelText(/cambiar prioridad/i)).toHaveValue('BAJA');
    expect(within(screen.getByLabelText('Datos del ticket')).getByText('Baja')).toBeInTheDocument();
  });
});
