import { defineConfig } from 'vite';

// Static build: `npm run build` writes dist/, deployable to Vercel/Netlify/any static host.
// ../shared holds the protocol module the client shares with the multiplayer server.
export default defineConfig({
  base: './',
  server: { fs: { allow: ['..'] } },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
