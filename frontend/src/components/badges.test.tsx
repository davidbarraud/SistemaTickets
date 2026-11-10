import { render, screen } from '@testing-library/react';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  const cases = [
    ['ABIERTO', 'Abierto'],
    ['EN_PROGRESO', 'En progreso'],
    ['RESUELTO', 'Resuelto'],
    ['CERRADO', 'Cerrado'],
  ] as const;

  it.each(cases)('%s muestra el texto "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('los cuatro estados usan estilos distintos', () => {
    render(
      <>
        {cases.map(([s]) => (
          <StatusBadge key={s} status={s} />
        ))}
      </>,
    );
    const classes = cases.map(([, label]) => screen.getByText(label).closest('[data-badge]')!.className);
    expect(new Set(classes).size).toBe(4);
  });

  it('lleva un indicador visual además del color (punto)', () => {
    render(<StatusBadge status="ABIERTO" />);
    expect(screen.getByText('Abierto').closest('[data-badge]')!.querySelector('[data-indicator]')).not.toBeNull();
  });
});

describe('PriorityBadge', () => {
  const cases = [
    ['BAJA', 'Baja', 1],
    ['MEDIA', 'Media', 2],
    ['ALTA', 'Alta', 3],
    ['URGENTE', 'Urgente', 4],
  ] as const;

  it.each(cases)('%s muestra el texto "%s"', (priority, label) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('las cuatro prioridades usan estilos distintos', () => {
    render(
      <>
        {cases.map(([p]) => (
          <PriorityBadge key={p} priority={p} />
        ))}
      </>,
    );
    const classes = cases.map(([, label]) => screen.getByText(label).closest('[data-badge]')!.className);
    expect(new Set(classes).size).toBe(4);
  });

  it.each(cases)('%s muestra %i barras llenas como indicador no basado solo en color', (priority, label, filled) => {
    render(<PriorityBadge priority={priority} />);
    const badge = screen.getByText(label).closest('[data-badge]')!;
    expect(badge.querySelectorAll('[data-bar="on"]')).toHaveLength(filled);
    expect(badge.querySelectorAll('[data-bar]')).toHaveLength(4);
  });
});
