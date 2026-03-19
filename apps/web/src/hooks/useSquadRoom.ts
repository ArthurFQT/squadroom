import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  PresenceUser,
  ServerToClientEvents,
  VoiceParticipant,
  WebRtcDescription,
  WebRtcIceCandidate,
} from "@squadroom/shared";
import { MESSAGE_LIMIT, RTC_CONFIGURATION } from "../lib/constants";
import {
  getDefaultRoomId,
  getDefaultServerUrl,
  getDefaultUsername,
  getVoiceJoinErrorMessage,
  toUiMessage,
  toWebRtcDescription,
} from "../lib/room";
import type { RemoteAudio, UiMessage } from "../types/ui";

type UseSquadRoomState = {
  roomId: string;
  username: string;
  draft: string;
  joined: boolean;
  messages: UiMessage[];
  users: PresenceUser[];
  typingUsers: string[];
  connecting: boolean;
  connectionError: string | null;
  voiceEnabled: boolean;
  voiceMuted: boolean;
  hasLocalAudio: boolean;
  voiceMembers: VoiceParticipant[];
  voiceError: string | null;
  audioUnlockRequired: boolean;
  audioUnlockNonce: number;
  remoteAudioStreams: RemoteAudio[];
  serverUrl: string;
  membersLabel: string;
  voiceLabel: string;
};

type UseSquadRoomActions = {
  setRoomId: (value: string) => void;
  setUsername: (value: string) => void;
  updateDraft: (value: string) => void;
  connectRoom: () => void;
  leaveRoom: () => void;
  sendMessage: (event: FormEvent<HTMLFormElement>) => void;
  joinVoice: () => Promise<void>;
  leaveVoice: (emitToServer: boolean) => void;
  toggleMute: () => void;
  unlockRemoteAudio: () => void;
  markAudioAutoplayBlocked: () => void;
};

export type UseSquadRoomResult = {
  state: UseSquadRoomState;
  actions: UseSquadRoomActions;
  refs: {
    messageListRef: RefObject<HTMLDivElement | null>;
  };
};

export function useSquadRoom(): UseSquadRoomResult {
  const [roomId, setRoomId] = useState(() => getDefaultRoomId());
  const [username, setUsername] = useState(() => getDefaultUsername());
  const [draft, setDraft] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [hasLocalAudio, setHasLocalAudio] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceParticipant[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioUnlockRequired, setAudioUnlockRequired] = useState(false);
  const [audioUnlockNonce, setAudioUnlockNonce] = useState(0);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<RemoteAudio[]>([]);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const serverUrl = useMemo(() => import.meta.env.VITE_SERVER_URL ?? getDefaultServerUrl(), []);

  const membersLabel = useMemo(
    () => (users.length === 1 ? "1 member online" : `${users.length} members online`),
    [users.length],
  );

  const voiceLabel = useMemo(() => {
    if (!voiceEnabled) return "Voice disabled";
    if (!hasLocalAudio) return "Listen-only mode";
    return voiceMuted ? "Voice connected (muted)" : "Voice connected";
  }, [hasLocalAudio, voiceEnabled, voiceMuted]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
  }, [messages.length, typingUsers.length]);

  useEffect(() => {
    const peerConnections = peerConnectionsRef.current;

    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }

      for (const peerConnection of peerConnections.values()) {
        peerConnection.close();
      }
      peerConnections.clear();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      socketRef.current?.disconnect();
    };
  }, []);

  function appendMessage(message: UiMessage) {
    setMessages((previous) => {
      const next = [...previous, message];
      return next.length > MESSAGE_LIMIT ? next.slice(next.length - MESSAGE_LIMIT) : next;
    });
  }

  function closePeerConnection(socketId: string) {
    const peerConnection = peerConnectionsRef.current.get(socketId);
    if (!peerConnection) return;
    peerConnection.close();
    peerConnectionsRef.current.delete(socketId);
  }

  function upsertRemoteAudioStream(socketId: string, stream: MediaStream) {
    setRemoteAudioStreams((previous) => {
      const withoutCurrent = previous.filter((entry) => entry.socketId !== socketId);
      return [...withoutCurrent, { socketId, stream }];
    });
  }

  function removeRemoteAudioStream(socketId: string) {
    setRemoteAudioStreams((previous) => previous.filter((entry) => entry.socketId !== socketId));
  }

  function updateVoiceMember(member: VoiceParticipant) {
    setVoiceMembers((previous) => {
      const withoutCurrent = previous.filter((current) => current.socketId !== member.socketId);
      return [...withoutCurrent, member];
    });
  }

  function removeVoiceMember(socketId: string) {
    setVoiceMembers((previous) => previous.filter((member) => member.socketId !== socketId));
  }

  function cleanupVoiceState() {
    for (const peerConnection of peerConnectionsRef.current.values()) {
      peerConnection.close();
    }
    peerConnectionsRef.current.clear();

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    setVoiceEnabled(false);
    setVoiceMuted(false);
    setHasLocalAudio(false);
    setVoiceMembers([]);
    setAudioUnlockRequired(false);
    setAudioUnlockNonce(0);
    setRemoteAudioStreams([]);
  }

  function leaveVoice(emitToServer: boolean) {
    if (emitToServer && socketRef.current && voiceEnabled) {
      socketRef.current.emit("voice_leave", { roomId });
    }
    cleanupVoiceState();
  }

  async function getOrCreatePeerConnection(peerSocketId: string) {
    const existingConnection = peerConnectionsRef.current.get(peerSocketId);
    if (existingConnection) return existingConnection;

    const socket = socketRef.current;
    if (!socket) throw new Error("socket is not connected");

    const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionsRef.current.set(peerSocketId, peerConnection);

    const localStream = localStreamRef.current;
    if (localStream) {
      for (const track of localStream.getTracks()) {
        peerConnection.addTrack(track, localStream);
      }
    } else {
      peerConnection.addTransceiver("audio", { direction: "recvonly" });
    }

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      upsertRemoteAudioStream(peerSocketId, stream);
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return;

      socketRef.current.emit("webrtc_ice_candidate", {
        roomId,
        toSocketId: peerSocketId,
        candidate: event.candidate.toJSON() as WebRtcIceCandidate,
      });
    };

    peerConnection.onconnectionstatechange = () => {
      const currentState = peerConnection.connectionState;
      if (currentState !== "failed" && currentState !== "closed" && currentState !== "disconnected") return;
      closePeerConnection(peerSocketId);
      removeRemoteAudioStream(peerSocketId);
    };

    return peerConnection;
  }

  async function sendOffer(peerSocketId: string) {
    const socket = socketRef.current;
    if (!socket) return;

    try {
      const peerConnection = await getOrCreatePeerConnection(peerSocketId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const description = toWebRtcDescription(peerConnection.localDescription ?? null);
      if (!description) return;

      socket.emit("webrtc_offer", {
        roomId,
        toSocketId: peerSocketId,
        description,
      });
    } catch (error) {
      console.error("offer_failed", error);
    }
  }

  async function handleIncomingOffer(fromSocketId: string, description: WebRtcDescription) {
    const socket = socketRef.current;
    if (!socket) return;

    try {
      const peerConnection = await getOrCreatePeerConnection(fromSocketId);
      await peerConnection.setRemoteDescription(description);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      const normalizedAnswer = toWebRtcDescription(peerConnection.localDescription ?? null);
      if (!normalizedAnswer) return;

      socket.emit("webrtc_answer", {
        roomId,
        toSocketId: fromSocketId,
        description: normalizedAnswer,
      });
    } catch (error) {
      console.error("answer_failed", error);
    }
  }

  async function handleIncomingAnswer(fromSocketId: string, description: WebRtcDescription) {
    const peerConnection = peerConnectionsRef.current.get(fromSocketId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(description);
    } catch (error) {
      console.error("set_remote_answer_failed", error);
    }
  }

  async function handleIncomingIceCandidate(fromSocketId: string, candidate: WebRtcIceCandidate) {
    if (!voiceEnabled) return;

    try {
      const peerConnection = await getOrCreatePeerConnection(fromSocketId);
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error("ice_candidate_failed", error);
    }
  }

  async function joinVoice() {
    if (!socketRef.current || !joined || voiceEnabled) return;

    setVoiceError(null);
    setAudioUnlockRequired(false);

    function enableListenOnly(reason: string) {
      setVoiceEnabled(true);
      setVoiceMuted(true);
      setHasLocalAudio(false);
      setVoiceError(reason);
      socketRef.current?.emit("voice_join", { roomId });
      socketRef.current?.emit("voice_set_muted", { roomId, isMuted: true });
      appendMessage({
        id: crypto.randomUUID(),
        author: "system",
        body: "Voice connected in listen-only mode.",
        createdAt: Date.now(),
        kind: "system",
      });
    }

    if (!window.isSecureContext) {
      enableListenOnly("Sem HTTPS no celular: microfone bloqueado. Entrando em modo ouvir apenas.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      enableListenOnly("Navegador sem suporte ao microfone. Entrando em modo ouvir apenas.");
      return;
    }

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = localStream;
      setVoiceEnabled(true);
      setVoiceMuted(false);
      setHasLocalAudio(true);

      socketRef.current.emit("voice_join", { roomId });
      appendMessage({
        id: crypto.randomUUID(),
        author: "system",
        body: "Voice channel connected.",
        createdAt: Date.now(),
        kind: "system",
      });
    } catch (error) {
      console.error("voice_join_failed", error);
      enableListenOnly(`${getVoiceJoinErrorMessage(error)} Entrando em modo ouvir apenas.`);
    }
  }

  function toggleMute() {
    if (!voiceEnabled || !hasLocalAudio || !localStreamRef.current || !socketRef.current) return;

    const nextMuted = !voiceMuted;
    for (const track of localStreamRef.current.getAudioTracks()) {
      track.enabled = !nextMuted;
    }

    setVoiceMuted(nextMuted);
    socketRef.current.emit("voice_set_muted", {
      roomId,
      isMuted: nextMuted,
    });
  }

  function unlockRemoteAudio() {
    setAudioUnlockRequired(false);
    setAudioUnlockNonce((previous) => previous + 1);
  }

  function markAudioAutoplayBlocked() {
    setAudioUnlockRequired(true);
  }

  function connectRoom() {
    if (!roomId.trim() || !username.trim() || connecting) return;
    setConnecting(true);
    setConnectionError(null);

    const socket = io(serverUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId: roomId.trim(), username: username.trim() });
      setJoined(true);
      setConnecting(false);
      setConnectionError(null);
      window.history.replaceState(null, "", `?room=${encodeURIComponent(roomId.trim())}`);
    });

    socket.on("room_users", ({ users: nextUsers }) => {
      setUsers(nextUsers);
    });

    socket.on("room_message", (payload) => {
      appendMessage(toUiMessage(payload));
    });

    socket.on("room_system", (payload) => {
      appendMessage({
        id: crypto.randomUUID(),
        author: "system",
        body: payload.body,
        createdAt: payload.createdAt,
        kind: "system",
      });
    });

    socket.on("voice_participants", ({ participants }) => {
      setVoiceMembers(participants);
      participants.forEach((participant: VoiceParticipant) => {
        void sendOffer(participant.socketId);
      });
    });

    socket.on("voice_state", ({ socketId, username: voiceUsername, isActive, isMuted }) => {
      if (socketId === socket.id) {
        if (!isActive) {
          cleanupVoiceState();
          return;
        }
        setVoiceMuted(isMuted);
        return;
      }

      if (!isActive) {
        removeVoiceMember(socketId);
        closePeerConnection(socketId);
        removeRemoteAudioStream(socketId);
        return;
      }

      updateVoiceMember({
        socketId,
        username: voiceUsername,
        isMuted,
      });
    });

    socket.on("webrtc_offer", ({ fromSocketId, description }) => {
      void handleIncomingOffer(fromSocketId, description);
    });

    socket.on("webrtc_answer", ({ fromSocketId, description }) => {
      void handleIncomingAnswer(fromSocketId, description);
    });

    socket.on("webrtc_ice_candidate", ({ fromSocketId, candidate }) => {
      void handleIncomingIceCandidate(fromSocketId, candidate);
    });

    socket.on("connect_error", () => {
      setConnecting(false);
      setJoined(false);
      setUsers([]);
      setTypingUsers([]);
      cleanupVoiceState();
      setConnectionError("Could not connect to server. Check backend status and URL.");
    });

    socket.on("room_typing", ({ username: typingUser, isTyping }) => {
      setTypingUsers((previous) => {
        if (isTyping) {
          return previous.includes(typingUser) ? previous : [...previous, typingUser];
        }
        return previous.filter((name) => name !== typingUser);
      });
    });

    socket.on("disconnect", () => {
      setJoined(false);
      setUsers([]);
      setTypingUsers([]);
      setConnecting(false);
      cleanupVoiceState();
      appendMessage({
        id: crypto.randomUUID(),
        author: "system",
        body: "Connection lost.",
        createdAt: Date.now(),
        kind: "system",
      });
    });
  }

  function leaveRoom() {
    if (!socketRef.current) return;
    leaveVoice(true);
    socketRef.current.emit("leave_room", { roomId });
    socketRef.current.disconnect();
    socketRef.current = null;
    setJoined(false);
    setUsers([]);
    setTypingUsers([]);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = draft.trim();
    if (!clean || !socketRef.current) return;

    socketRef.current.emit("send_message", { roomId, body: clean });
    setDraft("");
    socketRef.current.emit("typing", { roomId, isTyping: false });
  }

  function updateDraft(next: string) {
    setDraft(next);
    if (!socketRef.current) return;

    socketRef.current.emit("typing", { roomId, isTyping: next.trim().length > 0 });
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      socketRef.current?.emit("typing", { roomId, isTyping: false });
    }, 1200);
  }

  return {
    state: {
      roomId,
      username,
      draft,
      joined,
      messages,
      users,
      typingUsers,
      connecting,
      connectionError,
      voiceEnabled,
      voiceMuted,
      hasLocalAudio,
      voiceMembers,
      voiceError,
      audioUnlockRequired,
      audioUnlockNonce,
      remoteAudioStreams,
      serverUrl,
      membersLabel,
      voiceLabel,
    },
    actions: {
      setRoomId,
      setUsername,
      updateDraft,
      connectRoom,
      leaveRoom,
      sendMessage,
      joinVoice,
      leaveVoice,
      toggleMute,
      unlockRemoteAudio,
      markAudioAutoplayBlocked,
    },
    refs: {
      messageListRef,
    },
  };
}
