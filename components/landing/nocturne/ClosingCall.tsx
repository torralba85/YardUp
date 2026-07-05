import Link from "next/link";
import { Reveal } from "./Reveal";

/** Closing CTA: one quiet, confident ask before the footer. */
export function ClosingCall() {
  return (
    <section id="start" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <Reveal>
        <div className="rounded-lg border border-ln-hairline bg-ln-navy/50 p-8 sm:p-14">
          <p className="lf-kicker text-ln-slate">Ready when the owner is</p>
          <h2 className="ln-section-heading mt-4 max-w-3xl text-ln-mist">
            Know what to ask{" "}
            <em className="italic text-ln-glow">before</em> you spend on
            plans.
          </h2>
          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/studio"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-ln-glow px-8 text-sm font-semibold text-ln-ink transition-colors duration-300 hover:bg-ln-mist active:scale-[0.98]"
            >
              Check my address
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-ln-hairline px-8 text-sm font-semibold text-ln-mist transition-colors hover:border-ln-glow/60 hover:text-ln-glow"
            >
              Sign in
            </Link>
          </div>
          <p className="lf-caption mt-6 max-w-[60ch] text-ln-slate/70">
            Free to run. No permit is granted here and no income is guaranteed —
            you get an honest early read on your lot.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
