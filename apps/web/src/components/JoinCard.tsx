type JoinCardProps = {
  username: string;
  roomId: string;
  connecting: boolean;
  connectionError: string | null;
  onUsernameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onJoin: () => void;
};

export function JoinCard({
  username,
  roomId,
  connecting,
  connectionError,
  onUsernameChange,
  onRoomIdChange,
  onJoin,
}: JoinCardProps) {
  return (
    <section className="join-card">
      <h1>SquadRoom</h1>
      <p>Private room for chat + voice + mini-games.</p>

      <label>
        Nickname
        <input value={username} onChange={(event) => onUsernameChange(event.target.value)} maxLength={24} />
      </label>

      <label>
        Room ID
        <input value={roomId} onChange={(event) => onRoomIdChange(event.target.value)} maxLength={32} />
      </label>

      <button type="button" onClick={onJoin} disabled={connecting}>
        {connecting ? "Connecting..." : "Join Room"}
      </button>

      {connectionError ? <small className="error-text">{connectionError}</small> : null}
    </section>
  );
}
