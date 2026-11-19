// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("Firebase ATTOM runtime binding", () => {
  it.each(["ATTOM_API_KEY", "REALIE_API_KEY"])("binds %s only to api and makes it available to Next", async (key) => {
    const handler = vi.fn();
    const runtimeEnv: Record<string, string> = {};
    const functions: Record<string, {
      options: { secrets?: Array<{ name: string }> };
      handle: (req: unknown, res: unknown) => Promise<unknown>;
    }> = {};
    const defineSecret = (name: string) => ({ name, value: () => `${name}-runtime-value` });
    const modules: Record<string, unknown> = {
      "firebase-functions/v2/https": { onRequest: (options: unknown, handle: unknown) => ({ options, handle }) },
      "firebase-functions/params": { defineSecret },
      "firebase-functions/core": { onInit: vi.fn() },
      path,
      "./request-replay": { requestForNext: (req: unknown) => req },
      next: () => ({ getRequestHandler: () => handler, prepare: async () => {} }),
    };
    runInNewContext(readFileSync(path.resolve("functions/index.js"), "utf8"), {
      require: (name: string) => {
        if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
        return modules[name];
      },
      exports: functions, process: { env: runtimeEnv }, __dirname: path.resolve("functions"),
    });
    expect(functions.api.options.secrets?.filter((secret) => secret.name === key)).toHaveLength(1);
    for (const name of ["app", "apiAi", "apiStripe", "apiStore"]) {
      expect(functions[name].options.secrets?.some((secret) => secret.name === key) ?? false).toBe(false);
    }
    expect(runtimeEnv[key]).toBeUndefined();
    await functions.api.handle({}, {});
    expect(runtimeEnv[key]).toBe(`${key}-runtime-value`);
    expect(handler).toHaveBeenCalledOnce();
  });
});
