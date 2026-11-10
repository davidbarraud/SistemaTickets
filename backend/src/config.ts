export interface AppConfig {
  googleClientId: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  operatorEmails: string;
  frontendOrigin: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const jwtSecret = env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe estar definido en .env y tener al menos 32 caracteres');
  }
  return {
    googleClientId: env.GOOGLE_CLIENT_ID ?? '',
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '8h',
    operatorEmails: env.OPERATOR_EMAILS ?? '',
    frontendOrigin: env.FRONTEND_ORIGIN || 'http://localhost:5173',
    port: Number(env.PORT) || 3000,
  };
}
