import { DawnStudioLink } from "./DawnStudioLink";
import { Reveal } from "./Reveal";

/**
 * Feature showcase: AI concept panel and studio still. Photographs are
 * read-only content frames (rectangular per the pill-radius system).
 */
export function DuskShowcase() {
  return (
    <section aria-labelledby="showcase-heading" className="border-t border-ln-hairline/60 bg-ln-navy/30">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <Reveal>
          <p className="lf-kicker flex items-center gap-2.5 text-ln-glow">
            <span aria-hidden="true" className="h-px w-6 bg-ln-glow/70" />
            What you get
          </p>
          <h2 id="showcase-heading" className="ln-section-heading mt-4 max-w-2xl text-ln-mist">
            Rent, lot fit, and a concept that looks like it belongs.
          </h2>
        </Reveal>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <figure className="overflow-hidden rounded-lg border border-ln-hairline bg-ln-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/adu-dusk.jpg"
                alt="A small modern backyard ADU with warm interior light, cedar siding, and black steel frames"
                className="block w-full"
                loading="lazy"
                width={1920}
                height={1280}
              />
              <figcaption className="border-t border-ln-hairline px-4 py-2.5 lf-kicker-dense text-ln-slate">
                Style-matched concept · sample render
              </figcaption>
            </figure>
          </Reveal>

          <Reveal delay={120}>
            <div>
              <h3 className="ln-card-heading text-ln-mist">
                Concepts matched to your house, not a catalog.
              </h3>
              <p className="lf-body mt-4 max-w-[52ch] text-ln-slate">
                Upload a photo of your home and the studio drafts ADU concepts
                that match its materials and style—so what you show a builder
                already feels like it belongs on your lot.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ["3D lot studio", "Your house, setbacks, and the proposed ADU on one interactive scene."],
                  ["Plain-language insights", "Clear notes on what your lot’s numbers actually mean."],
                  ["Owner report", "Rent, build cost, payback, and assumptions—saved and shareable."],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-4">
                    <span aria-hidden="true" className="mt-2.5 h-px w-6 shrink-0 bg-ln-glow/70" />
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
                A full studio when you are ready to dig in.
              </h3>
              <p className="lf-body mt-4 max-w-[52ch] text-ln-slate">
                Open the studio to drag the ADU around your lot, watch setbacks
                and coverage update, and keep the fine print honest. Estimates
                only—never guarantees.
              </p>
              <p className="mt-8">
                <DawnStudioLink
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ln-hairline px-6 text-sm font-semibold text-ln-mist transition-colors hover:border-ln-glow/60 hover:text-ln-glow"
                >
                  Open the studio
                  <span aria-hidden="true">→</span>
                </DawnStudioLink>
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
              <figcaption className="border-t border-ln-hairline bg-ln-ink px-4 py-2.5 lf-kicker-dense text-ln-slate">
                The studio · setbacks + proposed ADU
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
