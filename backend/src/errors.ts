import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'No autenticado') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'No tenés permiso para esta operación') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Recurso no encontrado') =>
  new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, 'CONFLICT', message, details);

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Ruta no encontrada: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo no es JSON válido' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
};
