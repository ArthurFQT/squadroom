export const MESSAGE_LIMIT = 300;

export const DEFAULT_USERNAME_PREFIX = "guest";

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};
