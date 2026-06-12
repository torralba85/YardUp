import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("nextConfig headers", () => {
  it("allows auth popups to keep the opener relationship", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");

    const headers = await nextConfig.headers!();

    expect(headers).toContainEqual({
      source: "/:path*",
      headers: [
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups",
        },
      ],
    });
  });
});
