// Entry point: `npm start`. Configure with env vars (see README).
import { startServer } from './server.js';

const server = await startServer();
const shutdown = async signal => {
  console.log(`${signal}: shutting down`);
  await server.close();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
