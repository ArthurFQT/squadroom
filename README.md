# SquadRoom

Real-time social room for friends: chat first, voice and mini-games next.

## Stack

- React + TypeScript + Vite
- Node.js + Express + Socket.IO
- Yarn workspaces (monorepo)

## Project structure

```text
squadroom/
  apps/
    web/       # frontend React
      src/
        components/   # UI pura (sem regra de negocio)
        hooks/        # regra de negocio de chat/voice
        lib/          # helpers e constantes
        types/        # tipos de UI locais
    server/    # realtime backend
      src/
        socket/       # handlers de eventos socket.io
        config.ts     # env, CORS e utilitarios de LAN
        roomStore.ts  # estado em memoria da sala
        index.ts      # bootstrap HTTP + Socket.IO
  packages/
    shared/    # shared event/types contracts
```

## Code organization rules

- `components/`: apenas renderizacao e callbacks recebidos por props.
- `hooks/`: toda regra de negocio e side effects (socket, WebRTC, timers).
- `lib/`: funcoes puras e constantes reutilizaveis.
- `server/socket/`: handlers de eventos isolados do bootstrap.
- `packages/shared/`: contrato unico entre frontend e backend.

This separation makes debugging faster: if UI breaks, inspect `components`; if connection logic breaks, inspect `hooks`/`socket`.

## Features (current MVP)

- Join room by `roomId`
- Live presence list (online members)
- Real-time room chat
- Typing indicator
- System events (join/leave/disconnect)
- URL room sync (`?room=lobby`)
- Voice room (WebRTC mesh) with join/leave + mute/unmute

## Quick start

1. Install dependencies:

```bash
yarn
```

2. Optional env setup:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

3. Run all services:

```bash
yarn dev
```

4. Open:

- Web: `http://localhost:5173` (or next free port)
- Server health: `http://localhost:3001/health`

## LAN access (other device)

1. Keep backend on `HOST=0.0.0.0` and `CLIENT_ORIGINS=*` (already default in `.env.example`).
2. Start with `yarn dev`.
3. In the server logs, copy the `lan access` URL (example: `http://192.168.0.12:3001`).
4. Open web on the same host IP from another device: `http://192.168.0.12:5173`.
5. If needed, allow ports `5173` and `3001` in your firewall.

## Mobile audio requirement

- Mobile browsers usually block microphone on `http://<LAN-IP>`.
- For voice on phone, use an HTTPS URL (production deploy or HTTPS tunnel).
- `localhost` is a special case, but it only works on the same device.
- On non-HTTPS mobile access, app falls back to listen-only mode (you can still hear others).
- If remote sound is blocked by autoplay policy, use the `Enable Audio` button after joining voice.

## Deploy (HTTPS)

Recommended split:
- Frontend: Vercel
- Backend (Socket.IO): Render

### 1. Deploy backend on Render

This repo already includes [`render.yaml`](./render.yaml) for a backend web service.

Set Render environment variables:
- `NODE_VERSION=20.19.0`
- `HOST=0.0.0.0`
- `PORT` is provided by Render automatically
- `CLIENT_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app`

After deploy, copy backend URL:
- Example: `https://squadroom-api.onrender.com`

### 2. Deploy frontend on Vercel

This repo already includes [`vercel.json`](./vercel.json) for monorepo build output.

Set Vercel environment variable:
- `VITE_SERVER_URL=https://YOUR_RENDER_BACKEND.onrender.com`

Deploy and open your Vercel URL on desktop/mobile.

### 3. Validate voice

1. Open app on two devices in the same room.
2. Click `Join Voice` on both.
3. Accept microphone permission.
4. If remote sound is blocked, click `Enable Audio`.

### 4. Important for production voice quality

- STUN-only works for many users, but not all NAT/firewall scenarios.
- For robust cross-network voice, add a TURN server in `RTC_CONFIGURATION`.

## Scripts

- `yarn dev`: runs shared watch + server + web
- `yarn dev:server`: server only
- `yarn dev:web`: web only
- `yarn build:web`: builds shared + web only (Vercel)
- `yarn build:server`: builds shared + server only (Render)
- `yarn start:server`: runs backend production server
- `yarn build`: builds shared, web and server
- `yarn quality:gate`: alias for build gate

## Environment variables

### `apps/server/.env`

- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `3001`)
- `CLIENT_ORIGINS` (default: `*`, or comma-separated list)

### `apps/web/.env`

- `VITE_SERVER_URL` (optional; by default it uses current host + `:3001`)

## Roadmap

1. Voice hardening: TURN support, reconnection strategy, device selector
2. Private/locked rooms with invite links
3. Mini-games in-room (quick rounds)
4. Message persistence (Redis/Postgres)
5. Observability and production hardening

## Notes

- Current storage is in-memory (resets on server restart).
- This is intentionally backend-light to accelerate MVP iteration.
