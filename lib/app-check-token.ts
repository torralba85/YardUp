import { getLimitedUseToken } from "firebase/app-check";
import { getClientAppCheck } from "@/lib/firebase";

/** reCAPTCHA can be slow on a cold page; the request still goes out without a token. */
const TOKEN_TIMEOUT_MS = 8_000;

/**
 * A fresh single-use App Check token for a sensitive request, or null when App
 * Check is unavailable (tests, a blocked reCAPTCHA script, a timeout). The server
 * decides what a missing token means; this never throws.
 */
export async function limitedUseAppCheckToken(): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const appCheck = getClientAppCheck();
    if (!appCheck) return null;
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS); });
    const result = await Promise.race([getLimitedUseToken(appCheck), timeout]);
    return result?.token || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
