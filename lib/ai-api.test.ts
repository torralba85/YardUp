import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAduConfig, parcelPresets } from "./feasibility";

const { authMock, getGenerativeModelMock } = vi.hoisted(() => ({
  authMock: {
    currentUser: null as { getIdToken: () => Promise<string> } | null,
  },
  getGenerativeModelMock: vi.fn(),
}));

vi.mock("./firebase", () => ({ auth: authMock, ai: {} }));
vi.mock("firebase/ai", () => ({
  getGenerativeModel: getGenerativeModelMock,
  Schema: {
    array: vi.fn((value) => value),
    enumString: vi.fn((value) => value),
    object: vi.fn((value) => value),
    string: vi.fn(() => ({ type: "string" })),
  },
}));

import { AIRequestError, requestADUConcept } from "./ai-api";

describe("requestADUConcept", () => {
  beforeEach(() => {
    authMock.currentUser = {
      getIdToken: vi.fn().mockResolvedValue("firebase-id-token"),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("requires a signed-in user before constructing the provider request", async () => {
    authMock.currentUser = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestADUConcept({
        image: new File(["photo"], "home.jpg", { type: "image/jpeg" }),
        parcel: parcelPresets[0],
        config: defaultAduConfig,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AIRequestError>>({
        userMessage: "Sign in to generate an AI style-match concept.",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the Firebase token and explicit consent marker", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ imageDataUrl: "data:image/png;base64,eA==" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await requestADUConcept({
      image: new File(["photo"], "home.jpg", { type: "image/jpeg" }),
      parcel: parcelPresets[0],
      config: defaultAduConfig,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ Authorization: "Bearer firebase-id-token" });
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("consent")).toBe("true");
  });
});
