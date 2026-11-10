import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Card, EmptyState, PageHeader, Spinner } from './ui';

describe('Primitivas de UI', () => {
  it('Button habilitado dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Button deshabilitado no dispara onClick', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Guardar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Button es type="button" por defecto para no enviar formularios sin querer', () => {
    render(<Button>Acción</Button>);
    expect(screen.getByRole('button', { name: 'Acción' })).toHaveAttribute('type', 'button');
  });

  it('las variantes de Button usan estilos distintos', () => {
    render(
      <>
        <Button variant="primary">A</Button>
        <Button variant="secondary">B</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'A' }).className).not.toBe(screen.getByRole('button', { name: 'B' }).className);
  });

  it('Spinner expone un estado de carga accesible', () => {
    render(<Spinner label="Cargando tickets…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tickets…');
  });

  it('EmptyState muestra el mensaje y su acción', () => {
    render(<EmptyState action={<a href="/tickets/nuevo">Crear ticket</a>}>Todavía no hay tickets</EmptyState>);

    expect(screen.getByText('Todavía no hay tickets')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear ticket' })).toBeInTheDocument();
  });

  it('PageHeader muestra título como encabezado, subtítulo y acciones', () => {
    render(<PageHeader title="Mis tickets" subtitle="Tus pedidos" actions={<Button>Nuevo</Button>} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Mis tickets' })).toBeInTheDocument();
    expect(screen.getByText('Tus pedidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  it('Card con título lo muestra como encabezado de sección', () => {
    render(<Card title="Descripción">texto</Card>);
    expect(screen.getByRole('heading', { level: 2, name: 'Descripción' })).toBeInTheDocument();
    expect(screen.getByText('texto')).toBeInTheDocument();
  });
});
