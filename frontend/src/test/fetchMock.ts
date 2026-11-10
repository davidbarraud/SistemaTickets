/** Respuesta JSON para usar con vi.spyOn(globalThis, 'fetch'). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Route = { method?: string; path: string | RegExp; status?: number; body: unknown };

/**
 * Mockea fetch con una tabla de rutas. Devuelve el spy para inspeccionar llamadas.
 * Las rutas no declaradas responden 404, así un test no pasa por accidente.
 */
export function mockApi(routes: Route[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const route = routes.find(
      (r) =>
        (r.method ?? 'GET').toUpperCase() === method &&
        (typeof r.path === 'string' ? url === r.path : r.path.test(url)),
    );
    if (!route) {
      return jsonResponse({ error: { code: 'NOT_FOUND', message: `sin mock: ${method} ${url}` } }, 404);
    }
    return jsonResponse(route.body, route.status ?? 200);
  });
}
