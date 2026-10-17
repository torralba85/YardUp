import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  logRegridAuthFailure,
  regridTokenStatus,
  resetRegridTokenWarning,
  warnIfRegridTokenExpiring,
} from "./regrid-token";

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);
const DAY_S = 86_400;

/** A JWT-shaped token expiring `expSecondsFromNow` after NOW; the signature is fake. */
function jwt(expSecondsFromNow: number | undefined, payload: object = {}): string {
  const enc = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const claims =
    expSecondsFromNow === undefined
      ? { iss: "regrid.com", ...payload }
      : { iss: "regrid.com", exp: NOW / 1000 + expSecondsFromNow, ...payload };
  return `${enc({ alg: "HS256" })}.${enc(claims)}.c2lnbmF0dXJl`;
}

let error: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetRegridTokenWarning();
  error = vi.spyOn(console, "error").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("regridTokenStatus", () => {
  it("reports a missing or blank token", () => {
    expect(regridTokenStatus(undefined, NOW)).toEqual({ format: "missing" });
    expect(regridTokenStatus("   ", NOW)).toEqual({ format: "missing" });
  });

  it("does not try to read a token that is not a three-part JWT", () => {
    expect(regridTokenStatus("plain-opaque-token", NOW)).toEqual({ format: "opaque" });
    expect(regridTokenStatus("a.b", NOW)).toEqual({ format: "opaque" });
    expect(regridTokenStatus("a.!!!not-base64-json!!!.c", NOW)).toEqual({ format: "opaque" });
  });

  it("reads expiry from a JWT that is still valid", () => {
    expect(regridTokenStatus(jwt(30 * DAY_S), NOW)).toEqual({
      format: "jwt",
      expiresAt: "2026-10-29T12:00:00.000Z",
      daysLeft: 30,
      expired: false,
    });
  });

  it("marks an expired JWT with negative days left", () => {
    const status = regridTokenStatus(jwt(-92 * DAY_S), NOW);

    expect(status).toMatchObject({ format: "jwt", expired: true, daysLeft: -92 });
    expect(status.expiresAt).toBe("2026-06-29T12:00:00.000Z");
  });

  it("treats the exact expiry moment as expired", () => {
    expect(regridTokenStatus(jwt(0), NOW).expired).toBe(true);
  });

  it("recognises a JWT with no usable exp without judging it", () => {
    expect(regridTokenStatus(jwt(undefined), NOW)).toEqual({ format: "jwt" });
    expect(regridTokenStatus(jwt(undefined, { exp: "soon" }), NOW)).toEqual({ format: "jwt" });
  });

  it("never returns the token or its identity claims", () => {
    const token = jwt(30 * DAY_S, { u: "secret-user-id", g: "secret-group" });

    const serialized = JSON.stringify(regridTokenStatus(token, NOW));

    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain("secret-user-id");
    expect(serialized).not.toContain("secret-group");
  });
});

describe("logRegridAuthFailure", () => {
  it("logs one ERROR line with the status and token facts, not the token", () => {
    const token = jwt(-10 * DAY_S);

    logRegridAuthFailure(401, token);

    expect(error).toHaveBeenCalledTimes(1);
    const line = String(error.mock.calls[0][0]);
    expect(JSON.parse(line)).toMatchObject({
      severity: "ERROR",
      event: "regrid_auth_failed",
      status: 401,
      token: { format: "jwt", expired: true },
    });
    expect(line).not.toContain(token);
  });
});

describe("warnIfRegridTokenExpiring", () => {
  it("stays quiet for a token with more than two weeks left", () => {
    warnIfRegridTokenExpiring(jwt(15 * DAY_S), NOW);

    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("warns at exactly two weeks and only once per instance", () => {
    warnIfRegridTokenExpiring(jwt(14 * DAY_S), NOW);
    warnIfRegridTokenExpiring(jwt(14 * DAY_S), NOW);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({
      severity: "WARNING",
      event: "regrid_token_expiring",
      daysLeft: 14,
      expired: false,
    });
  });

  it("logs an ERROR for an expired token", () => {
    warnIfRegridTokenExpiring(jwt(-1 * DAY_S), NOW);

    expect(warn).not.toHaveBeenCalled();
    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
      severity: "ERROR",
      event: "regrid_token_expiring",
      expired: true,
    });
  });

  it("cannot judge a token it cannot read, so it says nothing", () => {
    warnIfRegridTokenExpiring("plain-opaque-token", NOW);
    warnIfRegridTokenExpiring(undefined, NOW);
    warnIfRegridTokenExpiring(jwt(undefined), NOW);

    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("can be re-armed", () => {
    warnIfRegridTokenExpiring(jwt(1 * DAY_S), NOW);
    resetRegridTokenWarning();
    warnIfRegridTokenExpiring(jwt(1 * DAY_S), NOW);

    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("scripts/check-regrid-token.mjs", () => {
  /** Real epoch time here: the script reads Date.now(), not the fixed NOW above. */
  function run(token: string) {
    return spawnSync(process.execPath, ["scripts/check-regrid-token.mjs"], {
      input: token,
      encoding: "utf8",
      cwd: process.cwd(),
      env: { ...process.env, REGRID_API_KEY: "" },
    });
  }

  function liveJwt(expSecondsFromNow: number): string {
    const enc = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
    return `${enc({ alg: "HS256" })}.${enc({ iss: "regrid.com", exp })}.c2lnbmF0dXJl`;
  }

  it("exits 0 for a valid token and never prints it", () => {
    const token = liveJwt(60 * DAY_S);

    const result = run(token);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK");
    expect(result.stdout + result.stderr).not.toContain(token);
  });

  it("warns but exits 0 when the token expires within two weeks", () => {
    const result = run(liveJwt(3 * DAY_S));

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("WARNING");
  });

  it("exits 1 for an expired token", () => {
    const token = liveJwt(-90 * DAY_S);

    const result = run(token);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPIRED");
    expect(result.stdout + result.stderr).not.toContain(token);
  });

  it("exits 2 when there is no readable expiry", () => {
    expect(run("plain-opaque-token").status).toBe(2);
    expect(run("").status).toBe(2);
  });
});
