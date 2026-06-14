import { describe, expect, it, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";

describe("ServiceWorkerRegistration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers /sw.js when service workers are supported", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    render(<ServiceWorkerRegistration />);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("renders nothing and does not throw when unsupported", () => {
    vi.stubGlobal("navigator", {});

    const { container } = render(<ServiceWorkerRegistration />);

    expect(container).toBeEmptyDOMElement();
  });
});
