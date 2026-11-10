import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Comment, Ticket } from '../api/types';
import { mockApi } from '../test/fetchMock';
import { makeTicket } from '../test/fixtures';
import { renderApp, users } from '../test/renderApp';

vi.mock('@react-oauth/google', async () => (await import('../test/googleMock')).googleMock);

const op1 = { id: users.op1.id, name: users.op1.name, email: users.op1.email };

function comment(id: number, body: string, author: 'ana' | 'op1'): Comment {
  const u = users[author];
  return { id, body, createdAt: '2026-11-10T13:00:00.000Z', author: { id: u.id, name: u.name, role: u.role } };
}

/** Mockea el detalle y los comentarios de un ticket, más rutas extra. */
function mockTicket(ticket: Ticket, comments: Comment[] = [], extra: Parameters<typeof mockApi>[0] = []) {
  return mockApi([
    { path: `/api/tickets/${ticket.id}`, body: ticket },
    { path: `/api/tickets/${ticket.id}/comments`, body: comments },
    ...extra,
  ]);
}

describe('Detalle de ticket', () => {
  it('muestra todos los datos del ticket, incluida la nota de resolución', async () => {
    const t = makeTicket({
      id: 5,
      title: 'Impresora atascada',
      description: 'Se traba el papel',
      status: 'RESUELTO',
      resolutionNote: 'Se limpió el rodillo',
    });
    mockTicket(t);
    renderApp('/tickets/5', { as: users.ana });

    expect(await screen.findByRole('heading', { name: /impresora atascada/i })).toBeInTheDocument();
    expect(screen.getByText('Se traba el papel')).toBeInTheDocument();
    expect(screen.getByText('Resuelto')).toBeInTheDocument();
    expect(screen.getByText('Se limpió el rodillo')).toBeInTheDocument();
    // Acotado al bloque de datos: el encabezado de la sesión también muestra "Ana Pérez".
    const datos = screen.getByLabelText('Datos del ticket');
    expect(within(datos).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(datos).getByText('Op Uno')).toBeInTheDocument();
  });

  it('ticket inexistente o ajeno (404) muestra "Ticket no encontrado"', async () => {
    mockApi([]);
    renderApp('/tickets/999', { as: users.ana });

    expect(await screen.findByRole('alert')).toHaveTextContent(/ticket no encontrado/i);
  });

  describe('acciones según rol y estado', () => {
    it('Operador en un ticket ABIERTO puede tomarlo', async () => {
      const t = makeTicket({ id: 6, status: 'ABIERTO' });
      const fetchSpy = mockTicket(t, [], [
        { method: 'POST', path: '/api/tickets/6/take', body: { ...t, status: 'EN_PROGRESO', assignee: op1 } },
      ]);
      renderApp('/tickets/6', { as: users.op1 });

      await userEvent.click(await screen.findByRole('button', { name: /tomar ticket/i }));

      expect(await screen.findByText('En progreso')).toBeInTheDocument();
      expect(fetchSpy.mock.calls.some(([u, i]) => u === '/api/tickets/6/take' && i?.method === 'POST')).toBe(true);
    });

    it('el Operador asignado en EN_PROGRESO puede resolver, con nota obligatoria', async () => {
      const t = makeTicket({ id: 7, status: 'EN_PROGRESO', assignee: op1 });
      const fetchSpy = mockTicket(t, [], [
        {
          method: 'POST',
          path: '/api/tickets/7/resolve',
          body: { ...t, status: 'RESUELTO', resolutionNote: 'Driver reinstalado' },
        },
      ]);
      renderApp('/tickets/7', { as: users.op1 });

      await userEvent.click(await screen.findByRole('button', { name: /marcar como resuelto/i }));
      expect(screen.getByText('La nota de resolución es obligatoria')).toBeInTheDocument();
      expect(fetchSpy.mock.calls.some(([u]) => u === '/api/tickets/7/resolve')).toBe(false);

      await userEvent.type(screen.getByLabelText(/nota de resolución/i), '  Driver reinstalado ');
      await userEvent.click(screen.getByRole('button', { name: /marcar como resuelto/i }));

      expect(await screen.findByText('Resuelto')).toBeInTheDocument();
      const call = fetchSpy.mock.calls.find(([u]) => u === '/api/tickets/7/resolve')!;
      expect(call[1]?.body).toBe(JSON.stringify({ resolutionNote: 'Driver reinstalado' }));
    });

    it('otro Operador no ve la acción de resolver', async () => {
      mockTicket(makeTicket({ id: 8, status: 'EN_PROGRESO', assignee: op1 }));
      renderApp('/tickets/8', { as: users.op2 });

      await screen.findByText('En progreso');
      expect(screen.queryByRole('button', { name: /marcar como resuelto/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /tomar ticket/i })).not.toBeInTheDocument();
    });

    it('el Solicitante dueño en RESUELTO puede confirmar el cierre', async () => {
      const t = makeTicket({ id: 9, status: 'RESUELTO' });
      const fetchSpy = mockTicket(t, [], [
        { method: 'POST', path: '/api/tickets/9/close', body: { ...t, status: 'CERRADO', closedAt: '2026-11-10T15:00:00.000Z' } },
      ]);
      renderApp('/tickets/9', { as: users.ana });

      await userEvent.click(await screen.findByRole('button', { name: /confirmar cierre/i }));

      expect(await screen.findByText('Cerrado')).toBeInTheDocument();
      expect(fetchSpy.mock.calls.some(([u, i]) => u === '/api/tickets/9/close' && i?.method === 'POST')).toBe(true);
    });

    it.each(['ABIERTO', 'EN_PROGRESO'] as const)(
      'el Solicitante en %s no ve acciones de estado',
      async (status) => {
        mockTicket(makeTicket({ id: 10, status }));
        renderApp('/tickets/10', { as: users.ana });

        await screen.findByRole('heading', { level: 1 });
        expect(screen.queryByRole('button', { name: /confirmar cierre|tomar|resuelto/i })).not.toBeInTheDocument();
      },
    );

    it('un Operador no ve "Confirmar cierre" en un ticket RESUELTO', async () => {
      mockTicket(makeTicket({ id: 11, status: 'RESUELTO' }));
      renderApp('/tickets/11', { as: users.op1 });

      await screen.findByText('Resuelto');
      expect(screen.queryByRole('button', { name: /confirmar cierre/i })).not.toBeInTheDocument();
    });

    it('si la acción falla (409) muestra el error de la API', async () => {
      const t = makeTicket({ id: 12, status: 'ABIERTO' });
      mockTicket(t, [], [
        {
          method: 'POST',
          path: '/api/tickets/12/take',
          status: 409,
          body: { error: { code: 'CONFLICT', message: 'Otro operador ya tomó el ticket' } },
        },
      ]);
      renderApp('/tickets/12', { as: users.op1 });

      await userEvent.click(await screen.findByRole('button', { name: /tomar ticket/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Otro operador ya tomó el ticket');
    });
  });

  describe('comentarios', () => {
    it('lista los comentarios en orden con autor y rol, como texto plano', async () => {
      mockTicket(makeTicket({ id: 20 }), [
        comment(1, '<b>Sigue fallando</b>', 'ana'),
        comment(2, '¿Probaste reiniciar?', 'op1'),
      ]);
      renderApp('/tickets/20', { as: users.ana });

      const list = await screen.findByRole('list', { name: /comentarios/i });
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('<b>Sigue fallando</b>');
      expect(items[0].querySelector('b')).toBeNull();
      expect(within(items[0]).getByText('Ana Pérez')).toBeInTheDocument();
      expect(within(items[1]).getByText('Operador')).toBeInTheDocument();
    });

    it('publica un comentario y lo agrega a la lista', async () => {
      const fetchSpy = mockTicket(makeTicket({ id: 21 }), [], [
        { method: 'POST', path: '/api/tickets/21/comments', status: 201, body: comment(3, 'Gracias', 'ana') },
      ]);
      renderApp('/tickets/21', { as: users.ana });

      await userEvent.type(await screen.findByLabelText(/nuevo comentario/i), '  Gracias ');
      await userEvent.click(screen.getByRole('button', { name: /comentar/i }));

      const list = await screen.findByRole('list', { name: /comentarios/i });
      expect(within(list).getByText('Gracias')).toBeInTheDocument();
      const call = fetchSpy.mock.calls.find(([, i]) => i?.method === 'POST')!;
      expect(call[1]?.body).toBe(JSON.stringify({ body: 'Gracias' }));
      expect(screen.getByLabelText(/nuevo comentario/i)).toHaveValue('');
    });

    it('no envía comentarios vacíos', async () => {
      const fetchSpy = mockTicket(makeTicket({ id: 22 }));
      renderApp('/tickets/22', { as: users.ana });

      await userEvent.type(await screen.findByLabelText(/nuevo comentario/i), '   ');
      await userEvent.click(screen.getByRole('button', { name: /comentar/i }));

      expect(screen.getByText('El comentario no puede estar vacío')).toBeInTheDocument();
      expect(fetchSpy.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(false);
    });

    it('en un ticket CERRADO oculta el formulario de comentario', async () => {
      mockTicket(makeTicket({ id: 23, status: 'CERRADO' }), [comment(1, 'Listo', 'ana')]);
      renderApp('/tickets/23', { as: users.ana });

      await screen.findByText('Listo');
      expect(screen.queryByLabelText(/nuevo comentario/i)).not.toBeInTheDocument();
      expect(screen.getByText(/el ticket está cerrado/i)).toBeInTheDocument();
    });
  });

  it('el link "Volver" lleva al dashboard', async () => {
    mockTicket(makeTicket({ id: 30 }), [], [{ path: '/api/tickets', body: [] }]);
    renderApp('/tickets/30', { as: users.ana });

    await userEvent.click(await screen.findByRole('link', { name: /volver/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /mis tickets/i })).toBeInTheDocument());
  });
});
