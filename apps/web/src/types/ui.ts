export type UiMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  kind: "chat" | "system";
};

export type RemoteAudio = {
  socketId: string;
  stream: MediaStream;
};
