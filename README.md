# Pixel FAST — multiplayer digital campus

A walkable pixel-art FAST-NUCES Islamabad campus where students meet and talk to people standing near them.

```
campus/   browser game (Vite + vanilla JS, all art drawn in code)      -> static hosting (Vercel/Netlify)
server/   multiplayer server (Node + ws)                                -> container host (Fly.io/Render/Railway)
shared/   protocol.js: limits, valid scenes, avatar options, sanitisers (used by both)
```

## Run locally

```
cd server && npm install && npm start          # ws://localhost:8787/ws  (health: /health)
cd campus && npm install && npm run dev        # http://localhost:5173  (connects to the local server)
```

Open the game in two browser windows (or `node server/scripts/bot.js Hamza 60` for a test player near Gate 4) and walk up to each other to chat.

## How multiplayer works

- Every scene (campus, cafe, each floor, each classroom) is a separate room on the server.
- Clients send their position up to 10×/s, only when it changes. The server sends each player, 10×/s, only the
  players **within ~one screen (340 px) in the same scene**, capped at the nearest 80, and only what changed.
- **Proximity chat is enforced by the server**: a message is delivered only to players within 96 px (~30 m)
  in the same scene. Nobody else receives it, so it cannot be read from across campus.
- Chat is not stored anywhere.

## Security

| Threat | Protection |
|---|---|
| Other sites connecting | Origin allowlist (`ALLOWED_ORIGINS`), only the `/ws` path upgrades |
| Flooding / bots | 1 KB message cap, token-bucket rate limits (20 msg/s, chat 1/s with burst 3), kick after repeated violations, per-IP (10) and global (3000) connection caps, 10 s hello timeout, heartbeat drops dead sockets |
| Bad data / XSS | Every field validated on the server **and** again on the client (`shared/protocol.js`): scene keys, coordinates, avatar options from fixed lists, names/chat stripped of control & bidi characters; chat is rendered as text, never HTML |
| Abuse | English + Roman Urdu profanity masking for chat and names |
| Slow clients | Snapshots skipped (not queued) when a socket's buffer is full |

## Load test (Windows dev laptop, server and bots on the same machine)

| Scenario | Result |
|---|---|
| 1000 bots crowded on campus (worst case) | all connected, ~71 ms of the 100 ms tick budget |
| 2000 bots spread over campus, cafe, library, corridors, classrooms | all connected, server ~68% busy, ~3 KB/s per player |

Reproduce: `MAX_PER_IP=9000 MAX_CLIENTS=9000 npm start`, then `N=2000 SPREAD=real npm run load` (in `server/`).
One instance comfortably covers FAST Islamabad's realistic peak; see the roadmap for going beyond.

## Deploy

1. **Server** (Fly.io, Render or Railway): build `server/Dockerfile` from the repo root
   (`docker build -f server/Dockerfile .`). Set env vars from `server/.env.example`
   (`ALLOWED_ORIGINS` = your frontend URL, `TRUST_PROXY=1`). The platform provides TLS, so the URL is `wss://…/ws`.
   Health check: `GET /health`.
2. **Frontend** (Vercel/Netlify): root `campus/`, build `npm run build`, output `dist/`,
   env `VITE_WS_URL=wss://<server>/ws`.

## Tests

`cd server && npm test` — 12 tests: scene/look/name/chat validation, profanity filter, origin and path checks,
area-of-interest visibility, proximity chat range, scene isolation, "gone" on leaving, sanitising of hostile
profiles, rate limits, oversize/garbage input, health endpoint.

## Roadmap

1. **Accounts**: sign in with the university email (magic link / OTP) so names are real and bans stick.
2. **Moderation tools**: mute / block / report a player, admin kick.
3. **Scale out**: shard scenes across several server processes (campus on one, buildings on others) behind a
   small router; add Redis only if cross-shard features (global announcements, friends) are needed.
4. **Interiors**: real corridor and classroom layouts from photos.
