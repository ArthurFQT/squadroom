import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@squadroom/shared";
import { corsOrigin, getLanUrls, serverConfig } from "./config.js";
import { RoomStore } from "./roomStore.js";
import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";

const app = express();
app.use(
  cors({
    origin: corsOrigin,
  }),
);
app.get("/health", (_, response) => response.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const store = new RoomStore();
registerSocketHandlers(io, store);

httpServer.listen(serverConfig.port, serverConfig.host, () => {
  console.log(`squadroom server listening on http://localhost:${serverConfig.port}`);
  const lanUrls = getLanUrls(serverConfig.port);
  if (lanUrls.length > 0) {
    console.log(`lan access: ${lanUrls.join(" | ")}`);
  }
});
