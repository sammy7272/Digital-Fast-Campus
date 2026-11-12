// Runs the server for SECS seconds then exits cleanly (used for profiling: node --cpu-prof scripts/serve-for.js).
import { startServer } from '../src/server.js';
const s = await startServer({ maxPerIp: 5000, maxClients: 5000 });
setTimeout(async () => { await s.close(); process.exit(0); }, (Number(process.env.SECS) || 20) * 1000);
