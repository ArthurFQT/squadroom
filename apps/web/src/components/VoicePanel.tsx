import type { VoiceParticipant } from "@squadroom/shared";

type VoicePanelProps = {
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

export function VoicePanel({
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
}: VoicePanelProps) {
  return (
    <section className="voice-panel">
      <h3>Voice Room</h3>
      <p>{voiceLabel}</p>

      <div className="voice-actions">
        {!voiceEnabled ? (
          <button type="button" onClick={onJoinVoice}>
            Join Voice
          </button>
        ) : (
          <button type="button" onClick={onLeaveVoice}>
            Leave Voice
          </button>
        )}

        <button type="button" onClick={onToggleMute} disabled={!voiceEnabled || !hasLocalAudio}>
          {voiceMuted ? "Unmute" : "Mute"}
        </button>
      </div>

      {audioUnlockRequired ? (
        <button type="button" onClick={onUnlockAudio}>
          Enable Audio
        </button>
      ) : null}

      {voiceError ? <small className="error-text">{voiceError}</small> : null}

      <ul className="voice-members">
        {voiceMembers.map((member) => (
          <li key={member.socketId}>
            <span>{member.username}</span>
            <small>{member.isMuted ? "Muted" : "Live"}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
