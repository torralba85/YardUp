"use client";

import { useRef, useState } from "react";

type AnalysisResult = {
  rent: string;
  rentRange: string;
  buildRange: string;
  builderCount: number;
  description: string;
  aduSize: string;
  mockupImageBase64: string;
  mockupMimeType: string;
};

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AnalysisResult }
  | { status: "error"; message: string };

const defaultMetrics = [
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
  const [state, setState] = useState<PageState>({ status: "idle" });
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const metrics =
    state.status === "success"
      ? [
          { label: "Estimated rent", value: state.data.rent },
          { label: "Build range", value: state.data.buildRange },
          { label: "Builder matches", value: `${state.data.builderCount} ready` },
        ]
      : defaultMetrics;

  const handleAnalyze = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setState({ status: "error", message: "Please upload a photo of your property." });
      return;
    }

    setState({ status: "loading" });

    const formData = new FormData();
    const address = (
      e.currentTarget.elements.namedItem("address") as HTMLInputElement
    ).value;
    formData.append("address", address);
    formData.append("image", file);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Analysis failed.");
      setState({ status: "success", data: json });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

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

          <form className="analyzeForm" onSubmit={handleAnalyze}>
            <input
              type="text"
              name="address"
              className="addressInput"
              placeholder="123 Main St, City, State"
              autoComplete="street-address"
            />
            <label className="uploadLabel">
              <span className={fileName ? "fileSelected" : ""}>
                {fileName ? fileName : "Upload a backyard photo"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="fileInput"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            {state.status === "error" && (
              <div className="analysisError">{state.message}</div>
            )}
            <div className="actions">
              <button
                type="submit"
                className="primaryAction"
                disabled={state.status === "loading"}
              >
                {state.status === "loading" ? "Analyzing…" : "Estimate income potential"}
              </button>
              <a href="#builders" className="secondaryAction">
                Connect with builders
              </a>
            </div>
          </form>
        </div>

        <div className="incomePanel" id="estimate" aria-label="ADU income estimate preview">
          <div className="panelTopline">Live estimate</div>
          <div className="incomeValue">
            {state.status === "success" ? state.data.rent : "$2,450"}
          </div>
          <div className="incomeUnit">potential monthly rent</div>
          <p>
            {state.status === "success"
              ? state.data.description
              : "Comparable studio ADUs nearby rent around $2,310-$2,580. Estimate, not a guarantee."}
          </p>
          <div className="metricGrid">
            {metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
          {state.status === "loading" && (
            <div className="analysisLoading">
              <div className="loadingSpinner" />
              <span>Analyzing your property…</span>
            </div>
          )}
          {state.status === "success" && state.data.mockupImageBase64 && (
            <div className="mockupWrap">
              <div className="mockupLabel">AI-generated preview</div>
              <img
                src={`data:${state.data.mockupMimeType};base64,${state.data.mockupImageBase64}`}
                alt="AI-generated ADU mockup for your backyard"
                className="mockupImg"
              />
            </div>
          )}
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
            <strong>
              {state.status === "success" ? state.data.rent : "$2,450/mo"}
            </strong>
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
            <strong>
              {state.status === "success"
                ? `${state.data.builderCount} ADU builders ready`
                : "7 ADU builders ready"}
            </strong>
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
