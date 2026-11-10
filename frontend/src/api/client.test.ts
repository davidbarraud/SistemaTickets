import { jsonResponse } from '../test/fetchMock';
import { ApiError, apiFetch, onUnauthorized } from './client';
import { loadSession, saveSession } from './session';

const user = { id: 1, email: 'ana@test.org', name: 'Ana', pictureUrl: null, role: 'SOLICITANTE' as const };

describe('apiFetch', () => {
  it('agrega el header Authorization Bearer cuando hay sesión', async () => {
    saveSession({ token: 'tok-123', user });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));

    await apiFetch('/api/tickets');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/tickets');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok-123');
  });

  it('no envía Authorization cuando no hay sesión', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ status: 'ok' }));

    await apiFetch('/api/health');

    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).has('Authorization')).toBe(false);
  });

  it('serializa el body como JSON y devuelve la respuesta parseada', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ id: 7 }, 201));

    const result = await apiFetch<{ id: number }>('/api/tickets', {
      method: 'POST',
      body: { title: 'T', description: 'D' },
    });

    expect(result).toEqual({ id: 7 });
    const init = fetchSpy.mock.calls[0][1]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ title: 'T', description: 'D' }));
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('ante un error lanza ApiError con status, code, message y details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ field: 'title', message: 'x' }] } },
        400,
      ),
    );

    const error = await apiFetch('/api/tickets', { method: 'POST', body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
      details: [{ field: 'title', message: 'x' }],
    });
  });

  it('ante un 401 limpia la sesión y avisa a los suscriptores', async () => {
    saveSession({ token: 'vencido', user });
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Sesión vencida' } }, 401),
    );

    await expect(apiFetch('/api/tickets')).rejects.toMatchObject({ status: 401 });

    expect(loadSession()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('un 401 en el login no dispara el cierre de sesión global', async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Credencial inválida' } }, 401),
    );

    await expect(
      apiFetch('/api/auth/google', { method: 'POST', body: { credential: 'x' } }),
    ).rejects.toMatchObject({ status: 401 });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
