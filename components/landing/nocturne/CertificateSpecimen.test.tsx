import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TYPICAL_MARKET } from "@/lib/typical-market";
import { CertificateSpecimen } from "./CertificateSpecimen";

describe("CertificateSpecimen", () => {
  it("extends the owner path to the certificate and builder destinations", () => {
    render(<CertificateSpecimen />);

    expect(
      screen.getByRole("heading", { name: /certificate meets your builder/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Own the record")).toBeInTheDocument();
    expect(screen.getByText("Meet your builders")).toBeInTheDocument();
  });

  it("renders the parchment specimen with typical figures and the honesty stamp", () => {
    render(<CertificateSpecimen />);

    expect(screen.getByText("Certificate of Feasibility")).toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.rentBand)).toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.noi)).toBeInTheDocument();
    expect(screen.getByText(/concept · not a permit/i)).toBeInTheDocument();
    expect(screen.getByText(/specimen — your address replaces this/i)).toBeInTheDocument();
  });
});
