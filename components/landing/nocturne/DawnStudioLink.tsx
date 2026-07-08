"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { TYPICAL_MARKET } from "@/lib/typical-market";

export const DAWN_RAMP_MS = 520;

type DawnStudioLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
  href?: string;
};

export function DawnRampOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-label={`Opening studio. ${TYPICAL_MARKET.rentBand} per month typical.`}
      style={{ zIndex: "var(--z-index-coach)" }}
      className="fixed inset-0 grid place-items-center overflow-hidden bg-ln-ink text-ln-mist"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,#0A1120_0%,#342116_58%,#F2E5D5_100%)]"
      />
      <div className="relative mx-6 w-full max-w-xl rounded-lg border border-ln-glow/35 bg-ln-ink/72 p-6 text-center shadow-2xl shadow-ln-ink/40 backdrop-blur-md">
        <p className="lf-kicker-dense text-ln-glow">Opening studio</p>
        <p className="ln-money mt-3 text-4xl text-ln-money sm:text-5xl">
          {TYPICAL_MARKET.rentBand}
          <span className="ml-1 font-mono text-sm font-normal text-ln-slate"> /mo typical</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function DawnStudioLink({
  children,
  href = "/studio",
  onClick,
  target,
  ...props
}: DawnStudioLinkProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      target === "_blank"
    ) {
      return;
    }

    event.preventDefault();
    setPending(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      router.push(href);
    }, DAWN_RAMP_MS);
  }

  return (
    <>
      <a href={href} target={target} onClick={handleClick} {...props}>
        {children}
      </a>
      <DawnRampOverlay visible={pending} />
    </>
  );
}
