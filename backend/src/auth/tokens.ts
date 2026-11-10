import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppConfig } from '../config';

export function signSessionToken(userId: number, config: AppConfig): string {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(userId),
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/** Devuelve el id de usuario del token, o null si es inválido o venció. */
export function verifySessionToken(token: string, config: AppConfig): number | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    const id = typeof payload === 'object' ? Number(payload.sub) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
