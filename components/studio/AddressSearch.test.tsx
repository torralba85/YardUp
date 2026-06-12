import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AddressSearch from "./AddressSearch";

vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(),
}));

describe("AddressSearch", () => {
  it("submits typed addresses through the free-text search path", async () => {
    const user = userEvent.setup();
    const onSubmitText = vi.fn();

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={onSubmitText} />);

    await user.type(
      screen.getByLabelText("Search property address"),
      "456 Pine St, Denver, CO",
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(onSubmitText).toHaveBeenCalledWith("456 Pine St, Denver, CO");
  });
});
