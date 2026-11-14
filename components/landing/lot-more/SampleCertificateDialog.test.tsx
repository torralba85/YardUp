import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SampleCertificateDialog } from "./SampleCertificateDialog";

describe("sample report navigation", () => {
  it("allows user-initiated navigation out of the preview while keeping scripts, forms and storage disabled", () => {
    render(<SampleCertificateDialog city="san-diego" onClose={() => {}} />);
    const frame = screen.getByTitle("Full sample Certificate of Feasibility");
    expect(frame).toHaveAttribute("src", "/sample-certificate");
    expect(frame).toHaveAttribute("sandbox", "allow-top-navigation-by-user-activation");
    expect(screen.getByRole("dialog", { name: "Coyote Brush Court sample Certificate" })).toBeInTheDocument();
  });

  it("points non-default city sample dialogs to their city route", () => {
    render(<SampleCertificateDialog city="seattle" onClose={() => {}} />);
    expect(screen.getByTitle("Full sample Certificate of Feasibility")).toHaveAttribute(
      "src",
      "/sample-certificate/seattle",
    );
    expect(screen.getByRole("dialog", { name: "Oak Street sample Certificate" })).toBeInTheDocument();
  });
});
