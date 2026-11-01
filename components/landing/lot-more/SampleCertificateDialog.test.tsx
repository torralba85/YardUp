import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SampleCertificateDialog } from "./SampleCertificateDialog";

describe("sample report navigation", () => {
  it("allows user-initiated navigation out of the preview while keeping scripts, forms and storage disabled", () => {
    const html = renderToStaticMarkup(<SampleCertificateDialog city="seattle" onClose={() => {}} />);
    const document = new DOMParser().parseFromString(html, "text/html");
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("/sample-certificate");
    expect(frame?.getAttribute("sandbox")).toBe("allow-top-navigation-by-user-activation");
  });
});
