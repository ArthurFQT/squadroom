import { useEffect, useRef } from "react";
import type { RemoteAudio } from "../types/ui";

type RemoteAudioTrackProps = {
  stream: MediaStream;
  unlockNonce: number;
  onAutoplayBlocked: () => void;
};

type RemoteAudioMountProps = {
  streams: RemoteAudio[];
  unlockNonce: number;
  onAutoplayBlocked: () => void;
};

function RemoteAudioTrack({ stream, unlockNonce, onAutoplayBlocked }: RemoteAudioTrackProps) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    void ref.current.play().catch(() => {
      onAutoplayBlocked();
    });
  }, [onAutoplayBlocked, stream, unlockNonce]);

  return <audio ref={ref} autoPlay playsInline />;
}

export function RemoteAudioMount({ streams, unlockNonce, onAutoplayBlocked }: RemoteAudioMountProps) {
  return (
    <div className="audio-mount" aria-hidden>
      {streams.map((stream) => (
        <RemoteAudioTrack
          key={stream.socketId}
          stream={stream.stream}
          unlockNonce={unlockNonce}
          onAutoplayBlocked={onAutoplayBlocked}
        />
      ))}
    </div>
  );
}
