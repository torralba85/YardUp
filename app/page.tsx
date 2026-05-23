const metrics = [
  { label: "Estimated rent", value: "$2,450/mo" },
  { label: "Build range", value: "$278k-$334k" },
  { label: "Builder matches", value: "7 ready" },
];

const steps = [
  {
    title: "Estimate the upside",
    body: "YardUp starts with the money question: what could this backyard earn as a rental ADU?",
  },
  {
    title: "Check the path",
    body: "We frame the likely fit, budget, permit conditions, and timeline before you commit to plans.",
  },
  {
    title: "Meet ADU builders",
    body: "When the opportunity is clear, we connect you with builders who can price and build the project.",
  },
];

const projectSignals = ["MONEY", "COST", "FIT", "PERMIT", "BUILD", "PACKET"];

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow">YardUp ADU advisor</div>
          <h1>Your backyard could be earning rent.</h1>
          <p>
            YardUp shows homeowners the potential monthly income from an
            accessory dwelling unit, then connects them with ADU builders who can
            turn that opportunity into a real project.
          </p>
          <div className="actions">
            <a href="#estimate" className="primaryAction">
              Estimate income potential
            </a>
            <a href="#builders" className="secondaryAction">
              Connect with builders
            </a>
          </div>
        </div>

        <div className="incomePanel" id="estimate" aria-label="ADU income estimate preview">
          <div className="panelTopline">Live estimate</div>
          <div className="incomeValue">$2,450</div>
          <div className="incomeUnit">potential monthly rent</div>
          <p>
            Comparable studio ADUs nearby rent around $2,310-$2,580. Estimate,
            not a guarantee.
          </p>
          <div className="metricGrid">
            {metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="productStory" aria-label="YardUp project flow">
        <div className="phoneMock">
          <div className="phoneBar" />
          <div className="phoneHeader">
            <span>Project page</span>
            <strong>Backyard studio</strong>
          </div>
          <div className="phoneRent">
            <span>Income</span>
            <strong>$2,450/mo</strong>
          </div>
          <div className="signalList">
            {projectSignals.map((signal, index) => (
              <div className="signal" key={signal}>
                <span className={index === 0 ? "activeDot" : "dot"} />
                <span>{signal}</span>
              </div>
            ))}
          </div>
          <div className="builderCard" id="builders">
            <span>Builder match</span>
            <strong>7 ADU builders ready</strong>
            <p>Feasibility, design, permitting, and construction.</p>
          </div>
        </div>

        <div className="storyCopy">
          <div className="sectionLabel">From curiosity to builder-ready</div>
          <h2>One clear path from income estimate to ADU bids.</h2>
          <p>
            The original YardUp concept is not a yard service. It is the front
            door for homeowners who want to understand whether an ADU can create
            income, what it may cost, and which builder can help them move next.
          </p>
        </div>
      </section>

      <section className="steps" aria-label="How YardUp works">
        {steps.map((step) => (
          <div className="card" key={step.title}>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
