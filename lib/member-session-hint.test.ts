import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forgetMemberSession,
  hasMemberSessionHint,
  rememberMemberSession,
  subscribeMemberSession,
} from "./member-session-hint";

afterEach(() => {
  window.localStorage.clear();
});

describe("member session hint subscriptions", () => {
  it("updates the landing when this tab resolves an expired member session", () => {
    rememberMemberSession();
    const changed = vi.fn();
    const unsubscribe = subscribeMemberSession(changed);
    forgetMemberSession();

    expect(hasMemberSessionHint()).toBe(false);
    expect(changed).toHaveBeenCalledOnce();
    unsubscribe();
    rememberMemberSession();
    expect(changed).toHaveBeenCalledOnce();
  });

  it("also reports sign-in and changes made by another tab", () => {
    const changed = vi.fn();
    const unsubscribe = subscribeMemberSession(changed);
    rememberMemberSession();
    expect(changed).toHaveBeenCalledOnce();
    window.dispatchEvent(new StorageEvent("storage", { key: "lf:member-session" }));
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(changed).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
