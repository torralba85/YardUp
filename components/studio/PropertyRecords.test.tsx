import { fireEvent, render, screen } from "@testing-library/react";
import type { User } from "firebase/auth";
import { afterEach, expect, it, vi } from "vitest";
import PropertyRecords from "./PropertyRecords";

const user = { getIdToken: async () => "token" } as User;
afterEach(() => vi.unstubAllGlobals());

it("loads history automatically and spends comparable quota only after a click", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        sections: [{ title: "County assessments", lines: ["Land $30,000"] }],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        sections: [
          { title: "Comparable sales within one mile", lines: ["102 Main St"] },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  render(
    <PropertyRecords user={user} address="100 Main St" city="Austin, TX" />,
  );
  expect(await screen.findByText("Land $30,000")).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getByRole("button", { name: "See nearby comparable sales" }),
  );
  expect(await screen.findByText("102 Main St")).toBeVisible();
  expect(
    fetcher.mock.calls.map(([, init]) => JSON.parse(init.body).mode),
  ).toEqual(["history", "comparables"]);
});
