import type { PresenceUser, VoiceParticipant } from "@squadroom/shared";
import { VoicePanel } from "./VoicePanel";

type MembersSidebarProps = {
  roomId: string;
  membersLabel: string;
  users: PresenceUser[];
  onLeaveRoom: () => void;
  voiceLabel: string;
  voiceEnabled: boolean;
  voiceMuted: boolean;
  hasLocalAudio: boolean;
  voiceError: string | null;
  audioUnlockRequired: boolean;
  voiceMembers: VoiceParticipant[];
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onUnlockAudio: () => void;
};

export function MembersSidebar({
  roomId,
  membersLabel,
  users,
  onLeaveRoom,
  voiceLabel,
  voiceEnabled,
  voiceMuted,
  hasLocalAudio,
  voiceError,
  audioUnlockRequired,
  voiceMembers,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onUnlockAudio,
}: MembersSidebarProps) {
  return (
    <aside className="members">
      <h2>{roomId}</h2>
      <span>{membersLabel}</span>

      <ul>
        {users.map((user) => (
          <li key={user.socketId}>{user.username}</li>
        ))}
      </ul>

      <VoicePanel
        voiceLabel={voiceLabel}
        voiceEnabled={voiceEnabled}
        voiceMuted={voiceMuted}
        hasLocalAudio={hasLocalAudio}
        voiceError={voiceError}
        audioUnlockRequired={audioUnlockRequired}
        voiceMembers={voiceMembers}
        onJoinVoice={onJoinVoice}
        onLeaveVoice={onLeaveVoice}
        onToggleMute={onToggleMute}
        onUnlockAudio={onUnlockAudio}
      />

      <button type="button" onClick={onLeaveRoom}>
        Leave room
      </button>
    </aside>
  );
}
