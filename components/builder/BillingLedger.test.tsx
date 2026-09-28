import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BillingLedger from "./BillingLedger";
import type { BuilderLedgerEntry } from "@/lib/marketplace-types";

describe("BillingLedger", () => {
  it("renders empty state when ledger has no entries", () => {
    render(<BillingLedger ledger={[]} credits={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Credits")).toBeInTheDocument();
    expect(screen.getByText(/No billing activity recorded yet/i)).toBeInTheDocument();
    expect(screen.getByText("Total Spent")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders transaction rows, badges, and totals", () => {
    const entries: BuilderLedgerEntry[] = [
      {
        id: "entry-1",
        builderId: "builder-1",
        type: "purchase",
        creditsChange: 5,
        amountPaid: 199,
        referenceId: "stripe_sess_123",
        description: "5-Lead Credit Pack",
        createdAt: "2026-06-15T12:00:00.000Z",
      },
      {
        id: "entry-2",
        builderId: "builder-1",
        type: "unlock",
        creditsChange: -1,
        amountPaid: 0,
        referenceId: "LF-0482XY",
        description: "Unlocked Lead LF-0482XY",
        createdAt: "2026-06-16T15:30:00.000Z",
      },
      {
        id: "entry-3",
        builderId: "builder-1",
        type: "credit",
        creditsChange: 1,
        amountPaid: 0,
        referenceId: "LF-0482XY",
        description: "Bad-lead credit for lead LF-0482XY",
        createdAt: "2026-06-17T09:15:00.000Z",
      },
    ];

    render(<BillingLedger ledger={entries} credits={5} />);

    // Available balance
    expect(screen.getByText("5")).toBeInTheDocument();
    // Badges
    expect(screen.getByText("PURCHASE")).toBeInTheDocument();
    expect(screen.getByText("UNLOCK")).toBeInTheDocument();
    expect(screen.getByText("CREDITED")).toBeInTheDocument();

    // Descriptions
    expect(screen.getByText("5-Lead Credit Pack")).toBeInTheDocument();
    expect(screen.getByText("Unlocked Lead LF-0482XY")).toBeInTheDocument();
    expect(screen.getByText("Bad-lead credit for lead LF-0482XY")).toBeInTheDocument();

    // Amount paid
    expect(screen.getAllByText("$199").length).toBeGreaterThanOrEqual(1);
    // Totals
    expect(screen.getByText("Net Account Total")).toBeInTheDocument();
    expect(screen.getByText("5 balance")).toBeInTheDocument();
  });
});
