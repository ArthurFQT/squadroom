export type PresenceUser = {
  socketId: string;
  username: string;
};

export type VoiceParticipant = {
  socketId: string;
  username: string;
  isMuted: boolean;
};

export type WebRtcDescription = {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp: string;
};

export type WebRtcIceCandidate = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  author: string;
  body: string;
  createdAt: number;
};

export type ClientToServerEvents = {
  join_room: (payload: { roomId: string; username: string }) => void;
  leave_room: (payload: { roomId: string }) => void;
  send_message: (payload: { roomId: string; body: string }) => void;
  typing: (payload: { roomId: string; isTyping: boolean }) => void;
  voice_join: (payload: { roomId: string }) => void;
  voice_leave: (payload: { roomId: string }) => void;
  voice_set_muted: (payload: { roomId: string; isMuted: boolean }) => void;
  webrtc_offer: (payload: { roomId: string; toSocketId: string; description: WebRtcDescription }) => void;
  webrtc_answer: (payload: { roomId: string; toSocketId: string; description: WebRtcDescription }) => void;
  webrtc_ice_candidate: (payload: { roomId: string; toSocketId: string; candidate: WebRtcIceCandidate }) => void;
};

export type ServerToClientEvents = {
  room_users: (payload: { roomId: string; users: PresenceUser[] }) => void;
  room_message: (payload: ChatMessage) => void;
  room_system: (payload: { roomId: string; body: string; createdAt: number }) => void;
  room_typing: (payload: { roomId: string; username: string; isTyping: boolean }) => void;
  voice_participants: (payload: { roomId: string; participants: VoiceParticipant[] }) => void;
  voice_state: (payload: {
    roomId: string;
    socketId: string;
    username: string;
    isActive: boolean;
    isMuted: boolean;
  }) => void;
  webrtc_offer: (payload: { roomId: string; fromSocketId: string; username: string; description: WebRtcDescription }) => void;
  webrtc_answer: (payload: { roomId: string; fromSocketId: string; description: WebRtcDescription }) => void;
  webrtc_ice_candidate: (payload: { roomId: string; fromSocketId: string; candidate: WebRtcIceCandidate }) => void;
};
