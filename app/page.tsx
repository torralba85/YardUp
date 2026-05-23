export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="eyebrow">YardUp ADU income advisor</div>

        <div className="intro">
          <h1>Turn your yard into potential monthly income.</h1>
          <p>
            YardUp helps homeowners see what an accessory dwelling unit could
            earn, then connects them with ADU builders who can turn that
            opportunity into a real project.
          </p>
        </div>

        <div className="steps">
          <div className="card">
            <h2>Estimate income potential</h2>
            <p>
              Share your property basics and see how an ADU could support rental
              income, family housing, or long-term property value.
            </p>
          </div>
          <div className="card">
            <h2>Compare ADU options</h2>
            <p>
              Understand whether a detached unit, garage conversion, or backyard
              cottage may fit your goals and available space.
            </p>
          </div>
          <div className="card">
            <h2>Connect with builders</h2>
            <p>
              Get matched with ADU builders who can help with feasibility,
              design, permitting, and construction.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
