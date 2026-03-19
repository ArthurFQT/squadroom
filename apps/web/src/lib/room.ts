import type { ChatMessage, WebRtcDescription } from "@squadroom/shared";
import type { UiMessage } from "../types/ui";
import { DEFAULT_USERNAME_PREFIX } from "./constants";

export function getDefaultServerUrl() {
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export function getDefaultRoomId() {
  const roomFromUrl = new URLSearchParams(window.location.search).get("room")?.trim();
  return roomFromUrl && roomFromUrl.length > 0 ? roomFromUrl : "lobby";
}

export function getDefaultUsername() {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${DEFAULT_USERNAME_PREFIX}-${suffix}`;
}

export function toUiMessage(message: ChatMessage): UiMessage {
  return {
    id: message.id,
    author: message.author,
    body: message.body,
    createdAt: message.createdAt,
    kind: "chat",
  };
}

export function toWebRtcDescription(description: RTCSessionDescriptionInit | null): WebRtcDescription | null {
  if (!description || !description.type || !description.sdp) return null;
  return { type: description.type, sdp: description.sdp };
}

export function getVoiceJoinErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microfone bloqueado. Permita acesso ao microfone no navegador.";
    }
    if (error.name === "NotFoundError") {
      return "Nenhum microfone encontrado neste dispositivo.";
    }
    if (error.name === "NotReadableError") {
      return "Microfone em uso por outro app. Feche o app e tente novamente.";
    }
    if (error.name === "SecurityError") {
      return "Contexto inseguro. No celular, use HTTPS para liberar o microfone.";
    }
  }

  return "Nao foi possivel acessar o microfone.";
}
