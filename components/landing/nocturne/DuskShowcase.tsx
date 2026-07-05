import { Reveal } from "./Reveal";

/**
 * Feature showcase: the AI-concept panel (the generated blue-hour ADU) and
 * the studio panel (a real studio still). Photographs are read-only content,
 * so their frames stay rectangular per the pill-radius system.
 */
export function DuskShowcase() {
  return (
    <section aria-labelledby="showcase-heading" className="border-t border-ln-hairline/60 bg-ln-navy/30">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <Reveal>
          <p className="lf-kicker flex items-center gap-2.5 text-ln-amber">
            <span aria-hidden="true" className="h-px w-6 bg-ln-amber/70" />
            What you get
          </p>
          <h2 id="showcase-heading" className="ln-section-heading mt-4 max-w-2xl text-ln-mist">
            A survey you can read, a concept you can feel.
          </h2>
        </Reveal>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <figure className="overflow-hidden rounded-lg border border-ln-hairline bg-ln-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/adu-dusk.jpg"
                alt="A small modern ADU at dusk: cedar siding, black steel frames, floor-to-ceiling glass glowing warm from a lit interior"
                className="block w-full"
                loading="lazy"
                width={1920}
                height={1280}
              />
              <figcaption className="border-t border-ln-hairline px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ln-slate">
                Style-matched concept · rendered at blue hour
              </figcaption>
            </figure>
          </Reveal>

          <Reveal delay={120}>
            <div>
              <h3 className="ln-card-heading text-ln-mist">
                Concepts matched to your house, not a catalog.
              </h3>
              <p className="lf-body mt-4 max-w-[52ch] text-ln-slate">
                Feed the studio a photo of your home and the AI drafts ADU
                concepts in its materials and mood — so what you show a builder
                already belongs on your lot.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ["3D lot studio", "Your house, setbacks, and the proposed ADU on one interactive scene."],
                  ["AI parcel insights", "Plain-language notes on what your parcel's numbers actually mean."],
                  ["Owner report", "Rent, build range, payback, and assumptions — saved and shareable."],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-4">
                    <span aria-hidden="true" className="mt-2.5 h-px w-6 shrink-0 bg-ln-amber/70" />
                    <p className="lf-body-sm text-ln-slate">
                      <strong className="font-semibold text-ln-mist">{title}.</strong>{" "}
                      {body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
          <Reveal className="order-last lg:order-first">
            <div>
              <h3 className="ln-card-heading text-ln-mist">
                The studio works in daylight, too.
              </h3>
              <p className="lf-body mt-4 max-w-[52ch] text-ln-slate">
                Behind the hero is a working feasibility studio: drag the ADU
                around your lot, watch setbacks and coverage respond, and keep
                the fine print honest. Estimates, never guarantees.
              </p>
              <p className="mt-8">
                <a
                  href="/studio"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ln-hairline px-6 text-sm font-semibold text-ln-mist transition-colors hover:border-ln-amber/60 hover:text-ln-amber"
                >
                  Open the studio
                  <span aria-hidden="true">→</span>
                </a>
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <figure className="overflow-hidden rounded-lg border border-ln-hairline bg-lf-sand-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/studio-scene-still.png"
                alt="The LotFoundry studio: an existing house and a proposed ADU on a 3D lot, with the note 'Within declared limits — 20 ft front, 25 ft rear, 5 ft side setbacks.'"
                className="block w-full"
                loading="lazy"
                width={800}
                height={620}
              />
              <figcaption className="border-t border-ln-hairline bg-ln-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ln-slate">
                The studio · setbacks + proposed ADU
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
