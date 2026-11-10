import { resolveRole } from '../../src/auth/resolveRole';

describe('resolveRole', () => {
  const lista = 'soporte@empresa.org, Jefe@Empresa.org ,otro@empresa.org';

  it('asigna OPERADOR si el email está en la lista', () => {
    expect(resolveRole('soporte@empresa.org', lista)).toBe('OPERADOR');
  });

  it('no distingue mayúsculas en el email ni en la lista', () => {
    expect(resolveRole('Soporte@Empresa.org', lista)).toBe('OPERADOR');
    expect(resolveRole('jefe@empresa.org', lista)).toBe('OPERADOR');
  });

  it('ignora espacios alrededor de cada email de la lista y del email recibido', () => {
    expect(resolveRole('  otro@empresa.org ', lista)).toBe('OPERADOR');
  });

  it('asigna SOLICITANTE si el email no está en la lista', () => {
    expect(resolveRole('ana@empresa.org', lista)).toBe('SOLICITANTE');
  });

  it('asigna SOLICITANTE si la lista está vacía o no definida', () => {
    expect(resolveRole('soporte@empresa.org', '')).toBe('SOLICITANTE');
    expect(resolveRole('soporte@empresa.org', undefined)).toBe('SOLICITANTE');
  });

  it('no trata entradas vacías de la lista como coincidencia', () => {
    expect(resolveRole('', 'a@b.org,,')).toBe('SOLICITANTE');
  });

  it('no acepta coincidencias parciales', () => {
    expect(resolveRole('soporte@empresa.org.ar', lista)).toBe('SOLICITANTE');
  });
});
