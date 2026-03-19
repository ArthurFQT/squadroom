import type { FormEvent, RefObject } from "react";
import type { UiMessage } from "../types/ui";

type ChatPanelProps = {
  serverUrl: string;
  messages: UiMessage[];
  typingUsers: string[];
  draft: string;
  messageListRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChatPanel({
  serverUrl,
  messages,
  typingUsers,
  draft,
  messageListRef,
  onDraftChange,
  onSendMessage,
}: ChatPanelProps) {
  return (
    <section className="chat-panel">
      <header className="chat-header">
        <h2>Room chat</h2>
        <small>{serverUrl}</small>
      </header>

      <div className="messages" ref={messageListRef}>
        {messages.map((message) => (
          <article key={message.id} className={message.kind === "system" ? "message system" : "message"}>
            <header>
              <strong>{message.author}</strong>
              <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </header>
            <p>{message.body}</p>
          </article>
        ))}
        {typingUsers.length > 0 ? <div className="typing">{typingUsers.join(", ")} typing...</div> : null}
      </div>

      <form className="composer" onSubmit={onSendMessage}>
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Write a message..."
          maxLength={500}
        />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
