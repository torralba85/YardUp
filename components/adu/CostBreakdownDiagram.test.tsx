import { act } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CostBreakdownDiagram } from "./CostBreakdownDiagram";

describe("CostBreakdownDiagram", () => {
  it("hydrates its server-rendered SVG without replacing the markup", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<CostBreakdownDiagram />);
    document.body.append(container);
    const svg = container.querySelector("svg");
    const onRecoverableError = vi.fn();
    let root: Root | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, <CostBreakdownDiagram />, { onRecoverableError });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector("svg")).toBe(svg);
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });
});
