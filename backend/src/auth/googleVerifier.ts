import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

/** Verifica una credencial (ID token) de Google. Lanza un error si es inválida. */
export interface GoogleVerifier {
  verify(credential: string): Promise<GoogleProfile>;
}

export function createGoogleVerifier(clientId: string): GoogleVerifier {
  const client = new OAuth2Client(clientId);
  return {
    async verify(credential) {
      if (!clientId) throw new Error('GOOGLE_CLIENT_ID no está configurado');
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload?.email) throw new Error('La credencial de Google no incluye email');
      return {
        email: payload.email,
        emailVerified: payload.email_verified === true,
        name: payload.name ?? payload.email,
        picture: payload.picture,
      };
    },
  };
}
