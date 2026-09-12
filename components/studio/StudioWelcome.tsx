"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { BrandLockup } from "@/components/ui/BrandLockup";

const steps = [
  { title: "Find your property", copy: "Start with an address to explore your lot." },
  { title: "Make it yours", copy: "Choose a size and style for your backyard home." },
  { title: "See the possibilities", copy: "Review estimated costs, rental potential, and what to check next." },
];

/** Public introduction to the Studio. Dismissing sign-in never opens the workspace. */
export default function StudioWelcome() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-lot-chalk text-lot-ink" data-testid="studio-welcome">
      <header className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-[6%] py-3">
        <Link href="/" aria-label="LotFoundry home" className="inline-flex min-h-11 items-center rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lot-ink">
          <BrandLockup className="h-7" />
        </Link>
        <button type="button" onClick={() => setAuthOpen(true)} className="min-h-11 shrink-0 rounded-[3px] px-3 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lot-ink">
          Sign in
        </button>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl pb-[max(24px,env(safe-area-inset-bottom))] lg:grid lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-[6%] lg:pb-10">
        <figure className="mx-auto w-full max-w-xl lg:max-w-none">
          {/* Existing compressed concept artwork also used on the landing page. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/a-lot-more/parcel-after-mobile.webp"
            srcSet="/landing/a-lot-more/parcel-after-mobile.webp 768w, /landing/a-lot-more/parcel-after.webp 1536w"
            sizes="(min-width: 1024px) 50vw, 100vw"
            width={768}
            height={512}
            fetchPriority="high"
            alt="Illustrative model of a family home with a small orange backyard home and garden"
            className="h-[clamp(160px,27dvh,260px)] w-full object-contain lg:h-auto"
          />
          <figcaption className="px-[6%] pt-1 text-center text-[11px] text-lot-stone lg:pt-4">
            Illustrative concept. Your property will be different.
          </figcaption>
        </figure>

        <section aria-labelledby="studio-welcome-title" className="mx-auto w-full max-w-xl px-[6%] pt-6 lg:px-0 lg:pt-0">
          <h1 id="studio-welcome-title" className="max-w-[12ch] font-display text-[clamp(34px,9vw,46px)] leading-[1.04] font-medium tracking-[-0.055em] lg:text-[54px]">
            A little more room for life.
          </h1>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-lot-stone sm:text-base">
            Welcome to LotFoundry. Explore what a backyard home could make possible — for family, extra income, or whatever comes next.
          </p>

          <ol aria-label="How LotFoundry works" className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[24px_1fr] gap-3">
                <span aria-hidden="true" className="pt-0.5 font-display text-sm text-lot-stone">{index + 1}.</span>
                <div>
                  <h2 className="text-sm font-semibold">{step.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-lot-stone">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <button type="button" onClick={() => setAuthOpen(true)} className="mt-7 flex min-h-12 w-full items-center justify-between gap-4 rounded-[3px] bg-lot-orange px-5 py-3 text-base font-semibold text-lot-ink hover:bg-lot-orange-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lot-ink">
            Get started <ArrowRight size={20} aria-hidden="true" />
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-lot-stone">Sign in or create an account to open your Studio.</p>
          <p className="mt-5 text-xs leading-relaxed text-lot-stone">Early planning estimates, not permit approval or a guarantee of income.</p>
        </section>
      </main>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
