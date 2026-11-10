import type { GoogleProfile, GoogleVerifier } from '../../src/auth/googleVerifier';

const PREFIX = 'fake-google:';

/** Genera una credencial ficticia que solo entiende el verificador fake. */
export function googleCredential(profile: {
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}): string {
  const full: GoogleProfile = {
    email: profile.email,
    name: profile.name ?? profile.email.split('@')[0],
    picture: profile.picture,
    emailVerified: profile.emailVerified ?? true,
  };
  return PREFIX + Buffer.from(JSON.stringify(full)).toString('base64url');
}

/** Verificador de Google para tests: acepta solo credenciales creadas con googleCredential(). */
export const fakeGoogleVerifier: GoogleVerifier = {
  async verify(credential: string): Promise<GoogleProfile> {
    if (!credential.startsWith(PREFIX)) {
      throw new Error('Credencial de Google inválida');
    }
    return JSON.parse(Buffer.from(credential.slice(PREFIX.length), 'base64url').toString('utf8'));
  },
};
