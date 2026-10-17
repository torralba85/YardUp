"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./LotMoreLanding.module.css";
import { landingDemos, type LandingCity } from "@/lib/landing-demo";

export function SampleCertificateDialog({ city, onClose }: { city: LandingCity; onClose: () => void }) {
  const demo = landingDemos[city];
  const href = city === "seattle" ? "/sample-certificate" : `/sample-certificate/${city}`;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} className={styles.sampleDialog} aria-labelledby="sample-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className={styles.sampleToolbar}>
        <div>
          <h2 id="sample-title">{demo.name} sample Certificate</h2>
          <p>{demo.city} demo · market rent · use your browser’s Print → Save as PDF.</p>
        </div>
        <button type="button" aria-label="Close sample" onClick={onClose}><X size={22} aria-hidden="true" /></button>
      </div>
      <a className={styles.textLink} href={href} target="_blank" rel="noopener noreferrer">Open printable sample in a new tab</a>
      <iframe title="Full sample Certificate of Feasibility" src={href} sandbox="" />
    </dialog>
  );
}
