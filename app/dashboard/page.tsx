"use client";

import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import { useAuth } from "../../lib/auth-context";

const projectSignals = [
  { code: "MONEY", label: "Income range", status: "ready" as const },
  { code: "COST", label: "Build cost band", status: "ready" as const },
  { code: "FIT", label: "Site fit check", status: "active" as const },
  { code: "PERMIT", label: "Permit conditions", status: "pending" as const },
  { code: "BUILD", label: "Builder shortlist", status: "pending" as const },
  { code: "PACKET", label: "Builder packet", status: "pending" as const },
];

const statusLabel: Record<(typeof projectSignals)[number]["status"], string> = {
  ready: "Ready",
  active: "In progress",
  pending: "Up next",
};

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const greetingName =
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <main className="dashboard">
      <header className="dashHeader">
        <div>
          <div className="eyebrow">Your project</div>
          <h1>Hey {greetingName}, here&apos;s the plan.</h1>
          <p>
            We&apos;re tracking your backyard ADU from money question through
            builder hand-off. Pick the next step below.
          </p>
        </div>
        <Link href="/estimate" className="primaryAction">
          Run a new estimate
        </Link>
      </header>

      <section className="dashGrid">
        <article className="dashStat">
          <span>Potential rent</span>
          <strong>$2,450/mo</strong>
          <p>Studio ADU, mid-range finishes</p>
        </article>
        <article className="dashStat">
          <span>Build range</span>
          <strong>$278k–$334k</strong>
          <p>Includes site work and connections</p>
        </article>
        <article className="dashStat">
          <span>Payback</span>
          <strong>~11 yrs</strong>
          <p>At current rents and 7% financing</p>
        </article>
        <article className="dashStat">
          <span>Builder matches</span>
          <strong>7 ready</strong>
          <p>Verified ADU specialists in your area</p>
        </article>
      </section>

      <section className="dashSignals">
        <header>
          <h2>Project signals</h2>
          <p>Each signal flips on as we confirm it.</p>
        </header>
        <ol>
          {projectSignals.map((signal) => (
            <li key={signal.code} className={`signalRow signal-${signal.status}`}>
              <span className="signalCode">{signal.code}</span>
              <div>
                <strong>{signal.label}</strong>
                <span className="signalStatus">{statusLabel[signal.status]}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="dashActions">
        <Link href="/estimate" className="dashAction">
          <span className="eyebrow">Step 1</span>
          <strong>Refine the estimate</strong>
          <p>Adjust size, finishes, and parking to sharpen the income range.</p>
        </Link>
        <a href="#builders" className="dashAction">
          <span className="eyebrow">Step 2</span>
          <strong>Open the builder packet</strong>
          <p>Send your project brief to matched ADU builders for bids.</p>
        </a>
        <a href="mailto:hello@yardup.app" className="dashAction">
          <span className="eyebrow">Need a human?</span>
          <strong>Talk to an advisor</strong>
          <p>We&apos;ll walk you through permit and financing options.</p>
        </a>
      </section>
    </main>
  );
}
