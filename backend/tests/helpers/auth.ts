import type { User, UserRole } from '@prisma/client';
import { signSessionToken } from '../../src/auth/tokens';
import { loadConfig } from '../../src/config';
import { prisma } from '../../src/db';

let counter = 0;

/** Crea un usuario en la base de test y devuelve también un token de sesión válido. */
export async function createUserWithToken(
  role: UserRole,
  data: { email?: string; name?: string } = {},
): Promise<{ user: User; token: string; auth: string }> {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      email: data.email ?? `${role.toLowerCase()}${counter}@test.org`,
      name: data.name ?? `${role} ${counter}`,
      role,
    },
  });
  const token = signSessionToken(user.id, loadConfig(process.env));
  return { user, token, auth: `Bearer ${token}` };
}
