import type { PresenceUser, VoiceParticipant } from "@squadroom/shared";

type VoiceState = {
  roomId: string;
  isMuted: boolean;
};

export class RoomStore {
  private readonly usersBySocketId = new Map<string, PresenceUser>();
  private readonly roomBySocketId = new Map<string, string>();
  private readonly voiceBySocketId = new Map<string, VoiceState>();

  getUser(socketId: string) {
    return this.usersBySocketId.get(socketId);
  }

  getRoomId(socketId: string) {
    return this.roomBySocketId.get(socketId);
  }

  setUser(socketId: string, username: string, roomId: string) {
    this.usersBySocketId.set(socketId, { socketId, username });
    this.roomBySocketId.set(socketId, roomId);
  }

  removeUser(socketId: string) {
    this.usersBySocketId.delete(socketId);
    this.roomBySocketId.delete(socketId);
    this.voiceBySocketId.delete(socketId);
  }

  getRoomUsers(roomId: string) {
    return [...this.usersBySocketId.values()].filter((user) => this.roomBySocketId.get(user.socketId) === roomId);
  }

  setVoice(socketId: string, roomId: string, isMuted: boolean) {
    this.voiceBySocketId.set(socketId, { roomId, isMuted });
  }

  getVoice(socketId: string) {
    return this.voiceBySocketId.get(socketId);
  }

  removeVoice(socketId: string) {
    this.voiceBySocketId.delete(socketId);
  }

  getRoomVoiceParticipants(roomId: string): VoiceParticipant[] {
    const participants: VoiceParticipant[] = [];

    for (const [socketId, voiceState] of this.voiceBySocketId.entries()) {
      if (voiceState.roomId !== roomId) continue;
      const user = this.usersBySocketId.get(socketId);
      if (!user) continue;

      participants.push({
        socketId,
        username: user.username,
        isMuted: voiceState.isMuted,
      });
    }

    return participants;
  }

  canRelaySignaling(fromSocketId: string, toSocketId: string, roomId: string) {
    const fromRoom = this.roomBySocketId.get(fromSocketId);
    const toRoom = this.roomBySocketId.get(toSocketId);
    const fromVoice = this.voiceBySocketId.get(fromSocketId);
    const toVoice = this.voiceBySocketId.get(toSocketId);

    return (
      fromRoom === roomId &&
      toRoom === roomId &&
      fromVoice?.roomId === roomId &&
      toVoice?.roomId === roomId
    );
  }
}
