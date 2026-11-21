"use client";

import { useEffect, useRef, useState, useTransition, Suspense } from "react";
import { isNativeAppShell } from "@/lib/commerce/purchase-channel";
import { useWebBuilderAccess } from "@/lib/commerce/use-web-builder-access";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CURRENT_LEGAL_CONSENT, useAuth } from "@/lib/auth-context";
import { validateEmail } from "@/lib/account-settings";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { isAppleSignInEnabled } from "@/lib/auth-providers";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";
import {
  trackAuthPromptShown,
  trackSignupFailed,
  trackSignupStarted,
  trackSignupSucceeded,
} from "@/lib/analytics/events";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Field";
import { useRadioGroup, type RadioItemProps } from "@/components/ui/useRadioGroup";
import { useSignupFormState } from "@/hooks/useSignupFormState";

function SignupForm() {
  const { signUp, signInWithGoogle, signInWithApple, user, profile } = useAuth();
  const appleEnabled = isAppleSignInEnabled();
  const router = useRouter();
  const buildersAllowed = useWebBuilderAccess();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialRole = searchParams.get("role") === "builder" ? "builder" : "user";
  const nextParam = searchParams.get("next");
  const {
    displayName,
    email,
    role: selectedRole,
    legalAccepted,
    setDisplayName,
    setEmail,
    setRole,
    setLegalAccepted,
    clearSignupFormState,
  } = useSignupFormState({ defaultRole: initialRole });
  const [password, setPassword] = useState("");

  const role = buildersAllowed ? selectedRole : "user";
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<
    "legal" | "displayName" | "email" | "password" | null
  >(null);
  const [pendingAction, setPendingAction] = useState<"email" | "google" | "apple" | null>(null);
  const consentCheckboxRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const destinationAfterAuth = (resolvedRole: string) => {
    const allowBuilder = !isNativeAppShell();
    if (nextParam) {
      return safeRedirectPath(nextParam, allowBuilder);
    }
    return allowBuilder && resolvedRole === "builder" ? "/builder" : "/studio";
  };

  useEffect(() => {
    trackAuthPromptShown({
      surface: "signup_page",
      source: "direct_signup",
      mode: "sign_up",
    });
  }, []);

  useEffect(() => {
    if (user && profile) {
      const allowBuilder = !isNativeAppShell();
      if (nextParam) {
        router.replace(safeRedirectPath(nextParam, allowBuilder));
      } else {
        router.replace(allowBuilder && profile.role === "builder" ? "/builder" : "/studio");
      }
    }
  }, [nextParam, profile, router, user]);

  // Called before the signed-in early return so the hook order never changes.
  const { groupProps: roleGroupProps, getRadioProps: getRoleRadioProps } = useRadioGroup({
    value: role,
    onChange: (val) => setRole(val),
    values: ["user", "builder"] as const,
  });

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInvalidField(null);

    if (!legalAccepted) {
      setInvalidField("legal");
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      consentCheckboxRef.current?.focus();
      return;
    }

    if (!displayName.trim()) {
      setInvalidField("displayName");
      setError("Enter your full name.");
      displayNameRef.current?.focus();
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setInvalidField("email");
      setError(emailError);
      emailRef.current?.focus();
      return;
    }

    if (password.length < 8) {
      setInvalidField("password");
      setError("Password must be at least 8 characters.");
      passwordRef.current?.focus();
      return;
    }

    setPendingAction("email");
    startTransition(async () => {
      try {
        trackSignupStarted({
          method: "password",
          surface: "signup_page",
          source: "direct_signup",
          role,
        });
        await signUp(email, password, displayName, role, CURRENT_LEGAL_CONSENT);
        clearSignupFormState();
        trackSignupSucceeded({
          method: "password",
          surface: "signup_page",
          source: "direct_signup",
          role,
        });
        router.push(destinationAfterAuth(role));
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        trackSignupFailed({
          method: "password",
          surface: "signup_page",
          source: "direct_signup",
          role,
          error_code: code,
        });
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleGoogle = async () => {
    setError(null);
    setInvalidField(null);
    if (!legalAccepted) {
      setInvalidField("legal");
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      consentCheckboxRef.current?.focus();
      return;
    }
    setPendingAction("google");
    startTransition(async () => {
      try {
        trackSignupStarted({
          method: "google",
          surface: "signup_page",
          source: "direct_signup",
          role,
        });
        const credential = await signInWithGoogle(role, CURRENT_LEGAL_CONSENT);
        clearSignupFormState();
        if (credential.profileCreated) {
          trackSignupSucceeded({
            method: "google",
            surface: "signup_page",
            source: "direct_signup",
            role,
          });
        }
        router.push(destinationAfterAuth(role));
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        trackSignupFailed({
          method: "google",
          surface: "signup_page",
          source: "direct_signup",
          role,
          error_code: code,
        });
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleApple = async () => {
    setError(null);
    setInvalidField(null);
    if (!legalAccepted) {
      setInvalidField("legal");
      setError("Confirm that you are 18 or older and accept the Terms and Privacy Policy.");
      consentCheckboxRef.current?.focus();
      return;
    }
    setPendingAction("apple");
    startTransition(async () => {
      try {
        trackSignupStarted({
          method: "apple",
          surface: "signup_page",
          source: "direct_signup",
          role,
        });
        const credential = await signInWithApple(role, CURRENT_LEGAL_CONSENT);
        clearSignupFormState();
        if (credential.profileCreated) {
          trackSignupSucceeded({
            method: "apple",
            surface: "signup_page",
            source: "direct_signup",
            role,
          });
        }
        router.push(destinationAfterAuth(role));
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        trackSignupFailed({
          method: "apple",
          surface: "signup_page",
          source: "direct_signup",
          role,
          error_code: code,
        });
        setError(code ? getAuthErrorMessage(code) : "Something went wrong. Please try again.");
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Save ADU rent and build estimates for your lot."
    >
      {error && !invalidField && (
        <div role="alert" className="lf-body-sm mb-4 rounded-none border border-status-blocked/20 bg-status-blocked-soft px-3 py-2 text-status-blocked">
          {error}
        </div>
      )}

      {buildersAllowed && <div className="mb-5">
        <p id="signup-role-label" className="lf-body-sm mb-1.5 block font-medium text-lot-ink">
          Account type
        </p>
        <div className="grid grid-cols-2 gap-3" aria-labelledby="signup-role-label" {...roleGroupProps}>
          <RoleButton
            label="Homeowner"
            description="Estimating your lot"
            selected={role === "user"}
            radioProps={getRoleRadioProps("user")}
          />
          <RoleButton
            label="Builder"
            description="Reviewing client lots"
            selected={role === "builder"}
            radioProps={getRoleRadioProps("builder")}
          />
        </div>
      </div>}

      <label
        className="flex min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lot-stone"
      >
        <Checkbox
          ref={consentCheckboxRef}
          id="signup-legal-consent"
          name="legalAccepted"
          checked={legalAccepted}
          aria-invalid={invalidField === "legal" || undefined}
          aria-describedby={invalidField === "legal" ? "signup-legal-error" : undefined}
          onChange={(event) => {
            setLegalAccepted(event.target.checked);
            if (invalidField === "legal") {
              setInvalidField(null);
              setError(null);
            }
          }}
          className="mt-0.5"
        />
        <span>
          I confirm I am 18 or older, agree to the{" "}
          <Link href="/terms" className="text-lot-orange-ink underline underline-offset-2 motion-safe:transition-colors hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2">
            Terms &amp; Conditions
          </Link>
          , and acknowledge the{" "}
          <Link href="/privacy" className="text-lot-orange-ink underline underline-offset-2 motion-safe:transition-colors hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {invalidField === "legal" && error && (
        <p id="signup-legal-error" role="alert" className="mt-1 text-sm text-status-blocked">
          {error}
        </p>
      )}

      <p id="signup-social-consent-help" className="mt-3 text-xs leading-5 text-lot-stone" aria-live="polite">
        {appleEnabled
          ? legalAccepted
            ? "Google and Apple account creation are ready."
            : "Check the age, Terms and Privacy confirmation above to enable Google or Apple account creation."
          : legalAccepted
            ? "Google account creation is ready."
            : "Check the age, Terms and Privacy confirmation above to enable Google account creation."}
      </p>
      <Button
        type="button"
        variant="commit"
        size="md"
        fullWidth
        onClick={handleGoogle}
        aria-describedby="signup-social-consent-help"
        disabled={isPending || !legalAccepted}
        loading={isPending && pendingAction === "google"}
        aria-busy={isPending && pendingAction === "google"}
        className="mt-4 font-medium disabled:border disabled:border-lot-line disabled:bg-lot-chalk disabled:text-lot-stone disabled:opacity-100"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {isPending && pendingAction === "google" ? "Connecting…" : "Google"}
      </Button>
      {appleEnabled && (
        <Button
          type="button"
          variant="commit"
          size="md"
          fullWidth
          onClick={handleApple}
          aria-describedby="signup-social-consent-help"
          disabled={isPending || !legalAccepted}
          loading={isPending && pendingAction === "apple"}
          aria-busy={isPending && pendingAction === "apple"}
          className="mt-2 font-medium disabled:border disabled:border-lot-line disabled:bg-lot-chalk disabled:text-lot-stone disabled:opacity-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.96-2.38 1.7-3.64 1.6-.1-1.1.4-2.26 1.18-3.08.9-.96 2.46-1.66 3.66-1.54zM20.5 17.2c-.62 1.42-1.36 2.8-2.42 2.82-1.04.02-1.38-.62-2.58-.62s-1.58.6-2.56.64c-1.04.04-1.84-1.3-2.48-2.7-1.28-2.82-.34-7 1.02-9.28.66-1.12 1.8-1.88 3.06-1.9 1.02-.02 1.98.68 2.58.68.6 0 1.74-.84 2.94-.72.5.02 1.9.2 2.8 1.52-.08.04-1.68 1-1.66 2.96.02 2.34 2.06 3.12 2.1 3.14-.02.06-.32 1.12-.82 2.2z" />
          </svg>
          {isPending && pendingAction === "apple" ? "Connecting…" : "Apple"}
        </Button>
      )}

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-lot-line" />
        </div>
        <div className="lf-caption relative flex justify-center">
          <span className="bg-lot-chalk px-2 text-lot-stone">Or use email</span>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="lf-body-sm mb-1.5 block font-medium text-lot-ink"
          >
            Full name
          </label>
          <Input
            id="displayName"
            name="displayName"
            ref={displayNameRef}
            type="text"
            required
            autoComplete="name"
            aria-invalid={invalidField === "displayName"}
            aria-describedby={invalidField === "displayName" ? "signup-display-name-error" : undefined}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (invalidField === "displayName") {
                setInvalidField(null);
                setError(null);
              }
            }}
            placeholder="Alma Reyes…"
          />
          {invalidField === "displayName" && error && (
            <p id="signup-display-name-error" role="alert" className="mt-1 text-sm text-status-blocked">
              {error}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="lf-body-sm mb-1.5 block font-medium text-lot-ink"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            ref={emailRef}
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            aria-invalid={invalidField === "email"}
            aria-describedby={invalidField === "email" ? "signup-email-error" : undefined}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (invalidField === "email") {
                setInvalidField(null);
                setError(null);
              }
            }}
            placeholder="you@example.com…"
          />
          {invalidField === "email" && error && (
            <p id="signup-email-error" role="alert" className="mt-1 text-sm text-status-blocked">
              {error}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="lf-body-sm mb-1.5 block font-medium text-lot-ink"
          >
            Password
          </label>
          <Input
            id="password"
            name="password"
            ref={passwordRef}
            type="password"
            required
            autoComplete="new-password"
            aria-invalid={invalidField === "password"}
            aria-describedby={invalidField === "password" ? "signup-password-error" : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (invalidField === "password") {
                setInvalidField(null);
                setError(null);
              }
            }}
            placeholder="At least 8 characters…"
          />
          {invalidField === "password" && error && (
            <p id="signup-password-error" role="alert" className="mt-1 text-sm text-status-blocked">
              {error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          disabled={isPending || !legalAccepted}
          loading={isPending && pendingAction === "email"}
          aria-busy={isPending && pendingAction === "email"}
        >
          {isPending && pendingAction === "email" ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="lf-body-sm mt-6 text-center text-lot-stone">
        Already have an account?{" "}
        <Link
          href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
          className="font-medium text-lot-orange-ink hover:text-lot-ink"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

function RoleButton({
  label,
  description,
  selected,
  radioProps,
}: {
  label: string;
  description: string;
  selected: boolean;
  radioProps: RadioItemProps;
}) {
  return (
    <button
      type="button"
      {...radioProps}
      className={`rounded-control border p-3 text-left motion-safe:transition ${
        selected
          ? "border-lot-ink bg-lot-ink"
          : "border-lot-line bg-lot-chalk hover:border-lot-stone"
      }`}
    >
      <div
        className={`text-sm font-semibold ${selected ? "text-lot-chalk" : "text-lot-ink"}`}
      >
        {label}
      </div>
      <div className={`lf-caption ${selected ? "text-lot-stone-on-dark" : "text-lot-stone"}`}>{description}</div>
    </button>
  );
}

/**
 * Sign-up route (`/signup`). Collects name, email, and password (plus Google
 * sign-up) to create an account via {@link useAuth}, then routes the new user
 * onward based on their role.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="p-8 text-center text-lot-stone">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
