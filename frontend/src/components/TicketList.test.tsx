import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeTicket } from '../test/fixtures';
import { TicketList } from './TicketList';

const renderList = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TicketList', () => {
  const urgente = makeTicket({ id: 7, title: 'Servidor caído', status: 'EN_PROGRESO', priority: 'URGENTE', category: 'RED' });
  const baja = makeTicket({ id: 8, title: 'Cambiar mouse', status: 'ABIERTO', priority: 'BAJA', category: 'HARDWARE' });

  it('cada ticket muestra estado, prioridad y categoría y enlaza a su detalle', () => {
    renderList(<TicketList tickets={[urgente, baja]} />);

    const row = screen.getByRole('link', { name: /servidor caído/i });
    expect(row).toHaveAttribute('href', '/tickets/7');
    expect(within(row).getByText('En progreso')).toBeInTheDocument();
    expect(within(row).getByText('Urgente')).toBeInTheDocument();
    expect(within(row).getByText('Red')).toBeInTheDocument();

    const other = screen.getByRole('link', { name: /cambiar mouse/i });
    expect(within(other).getByText('Baja')).toBeInTheDocument();
    expect(within(other).getByText('Hardware')).toBeInTheDocument();
  });

  it('tiene encabezados de columna para prioridad y categoría', () => {
    renderList(<TicketList tickets={[urgente]} />);

    expect(screen.getByRole('columnheader', { name: 'Prioridad' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Categoría' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Solicitante' })).not.toBeInTheDocument();
  });

  it('con showRequester agrega la columna y el nombre del solicitante', () => {
    renderList(<TicketList tickets={[urgente]} showRequester />);

    expect(screen.getByRole('columnheader', { name: 'Solicitante' })).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /servidor caído/i })).getByText('Ana Pérez')).toBeInTheDocument();
  });

  it('renderiza las acciones por fila fuera del link', () => {
    renderList(<TicketList tickets={[baja]} actions={() => <button type="button">Tomar</button>} />);

    const row = screen.getByRole('link', { name: /cambiar mouse/i });
    expect(within(row).queryByRole('button', { name: 'Tomar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomar' })).toBeInTheDocument();
  });
});
