import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UnlockSlip from "./UnlockSlip";
import type { BuilderInboxItem } from "@/lib/marketplace-types";

const item: BuilderInboxItem = {
  request: {
    id: "request-1",
    ownerUid: "owner-1",
    preview: {
      neighborhood: "Ballard, WA",
      zip: "98107",
      state: "WA",
      lotSqft: 6200,
      config: {
        footprint: 800,
        width: 25,
        length: 32,
        height: 14,
        roof: "gable",
        finish: "lap",
        includeOpenings: true,
      },
      aduSqft: 800,
      buildBandLow: 250000,
      buildBandHigh: 300000,
      rentBand: 2500,
      paybackYears: 14.2,
      zoningStatus: "Compliant",
      matchReasons: [],
      previewSerial: "LF-0482XY",
    },
    matchedBuilderIds: ["builder-1"],
    status: "submitted",
    ownerVerified: true,
    headStartUntil: null,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  },
  response: { builderId: "builder-1", status: "new", createdAt: null, updatedAt: null },
  unlocked: false,
};

describe("UnlockSlip", () => {
  it("renders the slip details, ledger, and bad-lead credit terms", () => {
    render(
      <UnlockSlip item={item} companyName="Ramos Build Co." pending={false} error={null} onConfirm={() => {}} onClose={() => {}} />,
    );

    expect(screen.getByRole("dialog", { name: /unlock this lead/i })).toBeInTheDocument();
    expect(screen.getByText(/Ramos Build Co\./)).toBeInTheDocument();
    expect(screen.getByText(/Unlock slip · LF-0482XY/)).toBeInTheDocument();
    expect(screen.getAllByText("$49.00").length).toBeGreaterThanOrEqual(2); // line item + DUE NOW
    expect(screen.getByText(/bad-lead credit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pay with Stripe/i })).toBeInTheDocument();
  });

  it("confirms via the pay button", async () => {
    const onConfirm = vi.fn();
    render(
      <UnlockSlip item={item} companyName="Ramos Build Co." pending={false} error={null} onConfirm={onConfirm} onClose={() => {}} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Pay with Stripe/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <UnlockSlip item={item} companyName="Ramos Build Co." pending={false} error={null} onConfirm={() => {}} onClose={onClose} />,
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows a recording state and disables actions while pending", () => {
    render(
      <UnlockSlip item={item} companyName="Ramos Build Co." pending error={null} onConfirm={() => {}} onClose={() => {}} />,
    );

    expect(screen.getByRole("button", { name: /recording unlock/i })).toBeDisabled();
  });
});
