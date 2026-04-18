"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [isFading, setIsFading] = useState(false);
  const [isGone, setIsGone] = useState(false);

  useEffect(() => {
    // Wait for 1.2 seconds, then start fading out
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1200);

    // After 1.7 seconds, remove it completely from the DOM
    const removeTimer = setTimeout(() => {
      setIsGone(true);
    }, 1700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (isGone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[color:var(--app-bg)] transition-opacity duration-500 ease-in-out ${
        isFading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-8 animate-logo-reveal">
        {/* Logo with Rotating Rings Wrapper */}
        <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
          {/* Outer Rotating Dashed Ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-[color:var(--app-brand-soft-strong)] animate-[spin_5s_linear_infinite]" />
          
          {/* Inner Fast Glowing Ring */}
          <div className="absolute inset-[6px] rounded-full border-[3px] border-[color:var(--app-border)] border-t-[color:var(--app-brand-text)] animate-[spin_1.5s_ease-in-out_infinite]" />

          {/* Logo Centerpiece */}
          <div className="relative z-10 flex shrink-0 items-center justify-center">
            <span
              aria-hidden="true"
              className="theme-logo-mark theme-logo-splash block h-[100px] w-[100px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
