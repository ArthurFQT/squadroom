import { randomUUID } from "node:crypto";
import type { ChatMessage, ClientToServerEvents, ServerToClientEvents, VoiceParticipant } from "@squadroom/shared";
import type { Server } from "socket.io";
import { RoomStore } from "../roomStore.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedServer, store: RoomStore) {
  function broadcastRoomUsers(roomId: string) {
    io.to(roomId).emit("room_users", { roomId, users: store.getRoomUsers(roomId) });
  }

  function removeVoicePresence(socketId: string) {
    const voiceState = store.getVoice(socketId);
    const user = store.getUser(socketId);
    if (!voiceState || !user) return;

    store.removeVoice(socketId);
    io.to(voiceState.roomId).emit("voice_state", {
      roomId: voiceState.roomId,
      socketId,
      username: user.username,
      isActive: false,
      isMuted: false,
    });
  }

  io.on("connection", (socket) => {
    socket.on("join_room", ({ roomId, username }) => {
      const cleanRoomId = roomId.trim().slice(0, 32) || "lobby";
      const cleanName = username.trim().slice(0, 24) || "Guest";

      const previousRoom = store.getRoomId(socket.id);
      if (previousRoom && previousRoom !== cleanRoomId) {
        removeVoicePresence(socket.id);
        socket.leave(previousRoom);
        socket.to(previousRoom).emit("room_system", {
          roomId: previousRoom,
          body: `${cleanName} switched room.`,
          createdAt: Date.now(),
        });
        broadcastRoomUsers(previousRoom);
      }

      store.setUser(socket.id, cleanName, cleanRoomId);

      socket.join(cleanRoomId);
      socket.emit("room_system", {
        roomId: cleanRoomId,
        body: `You joined room ${cleanRoomId}.`,
        createdAt: Date.now(),
      });
      socket.to(cleanRoomId).emit("room_system", {
        roomId: cleanRoomId,
        body: `${cleanName} joined the room.`,
        createdAt: Date.now(),
      });

      broadcastRoomUsers(cleanRoomId);
    });

    socket.on("leave_room", ({ roomId }) => {
      const activeRoomId = store.getRoomId(socket.id) ?? roomId;
      const user = store.getUser(socket.id);
      removeVoicePresence(socket.id);
      socket.leave(activeRoomId);
      store.removeUser(socket.id);

      if (user) {
        socket.to(activeRoomId).emit("room_system", {
          roomId: activeRoomId,
          body: `${user.username} left the room.`,
          createdAt: Date.now(),
        });
      }

      broadcastRoomUsers(activeRoomId);
    });

    socket.on("send_message", ({ roomId, body }) => {
      const user = store.getUser(socket.id);
      if (!user) return;

      const message: ChatMessage = {
        id: randomUUID(),
        roomId,
        author: user.username,
        body: body.trim().slice(0, 500),
        createdAt: Date.now(),
      };
      if (!message.body) return;

      io.to(roomId).emit("room_message", message);
    });

    socket.on("typing", ({ roomId, isTyping }) => {
      const user = store.getUser(socket.id);
      if (!user) return;

      socket.to(roomId).emit("room_typing", {
        roomId,
        username: user.username,
        isTyping,
      });
    });

    socket.on("voice_join", ({ roomId }) => {
      const user = store.getUser(socket.id);
      const joinedRoom = store.getRoomId(socket.id);
      if (!user || joinedRoom !== roomId) return;

      store.setVoice(socket.id, roomId, false);

      socket.emit("voice_participants", {
        roomId,
        participants: store
          .getRoomVoiceParticipants(roomId)
          .filter((participant: VoiceParticipant) => participant.socketId !== socket.id),
      });

      socket.to(roomId).emit("voice_state", {
        roomId,
        socketId: socket.id,
        username: user.username,
        isActive: true,
        isMuted: false,
      });
    });

    socket.on("voice_leave", ({ roomId }) => {
      const voiceState = store.getVoice(socket.id);
      if (!voiceState || voiceState.roomId !== roomId) return;
      removeVoicePresence(socket.id);
    });

    socket.on("voice_set_muted", ({ roomId, isMuted }) => {
      const voiceState = store.getVoice(socket.id);
      const user = store.getUser(socket.id);
      if (!voiceState || !user || voiceState.roomId !== roomId) return;

      store.setVoice(socket.id, roomId, isMuted);

      io.to(roomId).emit("voice_state", {
        roomId,
        socketId: socket.id,
        username: user.username,
        isActive: true,
        isMuted,
      });
    });

    socket.on("webrtc_offer", ({ roomId, toSocketId, description }) => {
      const user = store.getUser(socket.id);
      if (!user) return;
      if (!store.canRelaySignaling(socket.id, toSocketId, roomId)) return;

      io.to(toSocketId).emit("webrtc_offer", {
        roomId,
        fromSocketId: socket.id,
        username: user.username,
        description,
      });
    });

    socket.on("webrtc_answer", ({ roomId, toSocketId, description }) => {
      if (!store.canRelaySignaling(socket.id, toSocketId, roomId)) return;

      io.to(toSocketId).emit("webrtc_answer", {
        roomId,
        fromSocketId: socket.id,
        description,
      });
    });

    socket.on("webrtc_ice_candidate", ({ roomId, toSocketId, candidate }) => {
      if (!store.canRelaySignaling(socket.id, toSocketId, roomId)) return;

      io.to(toSocketId).emit("webrtc_ice_candidate", {
        roomId,
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on("disconnect", () => {
      const user = store.getUser(socket.id);
      const roomId = store.getRoomId(socket.id);

      removeVoicePresence(socket.id);
      store.removeUser(socket.id);

      if (user && roomId) {
        socket.to(roomId).emit("room_system", {
          roomId,
          body: `${user.username} disconnected.`,
          createdAt: Date.now(),
        });
        broadcastRoomUsers(roomId);
      }
    });
  });
}
