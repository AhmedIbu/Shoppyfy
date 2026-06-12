import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.port, () => {
  console.log(`🛍️  SEMMAI API running at http://localhost:${env.port}`);
});

const shutdown = async () => {
  console.log('Shutting down…');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
