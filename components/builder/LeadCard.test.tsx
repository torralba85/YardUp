import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LeadCard from "./LeadCard";
import type { BuilderInboxItem, UnlockedLeadContact } from "@/lib/marketplace-types";

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
      matchReasons: ["In your service area: Ballard, WA"],
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

const contact: UnlockedLeadContact = {
  ownerContact: { name: "Maria Torres", email: "maria.torres@gmail.com", phone: "(206) 555-0147", message: null },
  streetAddress: "7214 24th Ave NW",
  exactAPN: null,
  snapshot: { reportText: "certificate" } as UnlockedLeadContact["snapshot"],
};

const noop = () => {};

describe("LeadCard", () => {
  it("locked: shows the redacted preview, unlock CTA, and espresso price — no contact", () => {
    render(<LeadCard item={item} access="locked" contact={null} onUnlockClick={noop} onRespond={noop} />);

    expect(screen.getByText(/LF-0482XY/)).toBeInTheDocument();
    expect(screen.getByText("Ballard, WA")).toBeInTheDocument();
    expect(screen.getByText(/contact locked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unlock lead/i })).toBeInTheDocument();
    expect(screen.getByText("$49")).toBeInTheDocument();
    expect(screen.queryByText("Maria Torres")).not.toBeInTheDocument();
  });

  it("confirming: shows the recording state and the no-double-charge note", () => {
    render(<LeadCard item={item} access="confirming" contact={null} onUnlockClick={noop} onRespond={noop} />);

    expect(screen.getByText(/recording unlock/i)).toBeInTheDocument();
    expect(screen.getByText(/will not be charged twice/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Unlock lead/i })).not.toBeInTheDocument();
  });

  it("unlocked: reveals the contact, street address, and a demo stamp", () => {
    render(<LeadCard item={item} access="unlocked" contact={contact} demo onUnlockClick={noop} onRespond={noop} />);

    expect(screen.getByText("Maria Torres")).toBeInTheDocument();
    expect(screen.getByText(/maria\.torres@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText("7214 24th Ave NW")).toBeInTheDocument();
    expect(screen.getByText(/access recorded · demo/i)).toBeInTheDocument();
  });

  it("triages via the respond callback", () => {
    const onRespond = vi.fn();
    render(<LeadCard item={item} access="locked" contact={null} onUnlockClick={noop} onRespond={onRespond} />);

    screen.getByRole("button", { name: /Not a fit/i }).click();
    expect(onRespond).toHaveBeenCalledWith("not-a-fit");
  });

  it("eyebrow records the preview serial and the recorded date in mono", () => {
    render(<LeadCard item={item} access="locked" contact={null} onUnlockClick={noop} onRespond={noop} />);

    const eyebrow = screen.getByText(/NO\. LF-0482XY/);
    // Recorded date is the createdAt (UTC) rendered like the certificate: JUN 10, 2026.
    expect(eyebrow).toHaveTextContent(/RECORDED JUN 10, 2026/);
  });

  it("orders the forest value band ahead of the location and config (B2 hierarchy)", () => {
    render(<LeadCard item={item} access="locked" contact={null} onUnlockClick={noop} onRespond={noop} />);

    const valueBand = screen.getByText(/\$2,500/);
    const location = screen.getByText("Ballard, WA");
    // value band first, location second → location FOLLOWS the value band in the DOM.
    expect(
      valueBand.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("locked with active head start: shows exclusive window countdown and disables unlock button", () => {
    const headStartItem: BuilderInboxItem = {
      ...item,
      request: {
        ...item.request,
        headStartUntil: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        firstUnlockedBy: "another-builder",
      },
    };

    render(
      <LeadCard
        item={headStartItem}
        access="locked"
        contact={null}
        onUnlockClick={noop}
        onRespond={noop}
      />,
    );

    expect(
      screen.getByText(/Exclusive window active · Unlocked by 1 builder/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Exclusive window/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Unlock lead/i }),
    ).not.toBeInTheDocument();
  });

  it("unlocked: shows report button when onReport provided and reported is false", () => {
    const onReport = vi.fn();
    render(
      <LeadCard
        item={item}
        access="unlocked"
        contact={contact}
        onUnlockClick={noop}
        onRespond={noop}
        onReport={onReport}
      />,
    );

    const reportBtn = screen.getByRole("button", { name: /Report this lead/i });
    expect(reportBtn).toBeInTheDocument();
    reportBtn.click();
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("unlocked and reported: shows bad-lead credited badge instead of report button", () => {
    const onReport = vi.fn();
    render(
      <LeadCard
        item={item}
        access="unlocked"
        contact={contact}
        reported={true}
        onUnlockClick={noop}
        onRespond={noop}
        onReport={onReport}
      />,
    );

    expect(screen.getByText(/Bad-lead credited/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Report this lead/i }),
    ).not.toBeInTheDocument();
  });
});
