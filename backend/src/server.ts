import 'dotenv/config';
import { createApp } from './app';
import { createGoogleVerifier } from './auth/googleVerifier';
import { loadConfig } from './config';
import { prisma } from './db';

const config = loadConfig();
const app = createApp({
  prisma,
  config,
  googleVerifier: createGoogleVerifier(config.googleClientId),
});

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});
