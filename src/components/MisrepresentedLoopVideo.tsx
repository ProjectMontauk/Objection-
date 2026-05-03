"use client";

import { useEffect, useRef } from "react";

/** Loop the first six seconds (or full file if shorter) continuously. */
const LOOP_END = 6;
/** Seek back slightly before the segment end so the element does not enter `ended` / paused (common with 6s assets). */
const SEEK_MARGIN = 0.08;

export function MisrepresentedLoopVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const clipEnd = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        return Math.min(LOOP_END, v.duration);
      }
      return LOOP_END;
    };

    const restart = () => {
      v.currentTime = 0;
      void v.play().catch(() => {
        /* ignore */
      });
    };

    const onTimeUpdate = () => {
      const end = clipEnd();
      const threshold = Math.max(0, end - SEEK_MARGIN);
      if (v.currentTime >= threshold) {
        restart();
      }
    };

    const onEnded = () => {
      restart();
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);

    void v.play().catch(() => {
      /* autoplay blocked until gesture */
    });

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <figure className="w-full border-y border-rule bg-field">
      {/* Shorter than 16:9: full width of the clip, only top/bottom cropped via object-cover */}
      <div className="relative aspect-[16/5] w-full overflow-hidden bg-field">
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
          src="/Misrepresented.mp4"
          muted
          playsInline
          autoPlay
          preload="auto"
          aria-label="Misrepresented clip, looping the first six seconds"
        />
      </div>
    </figure>
  );
}
