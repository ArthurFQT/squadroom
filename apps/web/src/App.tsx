import { ChatPanel } from "./components/ChatPanel";
import { JoinCard } from "./components/JoinCard";
import { MembersSidebar } from "./components/MembersSidebar";
import { RemoteAudioMount } from "./components/RemoteAudioMount";
import { useSquadRoom } from "./hooks/useSquadRoom";
import "./App.css";

export default function App() {
  const {
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
    refs: { messageListRef },
  } = useSquadRoom();

  return (
    <main className="app">
      {!joined ? (
        <JoinCard
          username={username}
          roomId={roomId}
          connecting={connecting}
          connectionError={connectionError}
          onUsernameChange={setUsername}
          onRoomIdChange={setRoomId}
          onJoin={connectRoom}
        />
      ) : (
        <section className="layout">
          <MembersSidebar
            roomId={roomId}
            membersLabel={membersLabel}
            users={users}
            onLeaveRoom={leaveRoom}
            voiceLabel={voiceLabel}
            voiceEnabled={voiceEnabled}
            voiceMuted={voiceMuted}
            hasLocalAudio={hasLocalAudio}
            voiceError={voiceError}
            audioUnlockRequired={audioUnlockRequired}
            voiceMembers={voiceMembers}
            onJoinVoice={() => void joinVoice()}
            onLeaveVoice={() => leaveVoice(true)}
            onToggleMute={toggleMute}
            onUnlockAudio={unlockRemoteAudio}
          />

          <ChatPanel
            serverUrl={serverUrl}
            messages={messages}
            typingUsers={typingUsers}
            draft={draft}
            messageListRef={messageListRef}
            onDraftChange={updateDraft}
            onSendMessage={sendMessage}
          />
        </section>
      )}

      <RemoteAudioMount
        streams={remoteAudioStreams}
        unlockNonce={audioUnlockNonce}
        onAutoplayBlocked={markAudioAutoplayBlocked}
      />
    </main>
  );
}
