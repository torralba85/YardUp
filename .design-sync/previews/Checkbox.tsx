import { Checkbox } from "@lotfoundry/ui";

// The one checkbox. Wrap it with its text in a label at least 44px tall;
// className lands on the box's wrapper (mt-0.5 aligns it with a 24px line).
export const States = () => (
  <div className="flex w-80 flex-col">
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-lot-ink">
      <Checkbox />
      Email me when the zoning rules change
    </label>
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-lot-ink">
      <Checkbox defaultChecked />
      Active for new matched requests
    </label>
  </div>
);

// The consent pattern from sign-in: stone body text, deep-orange links.
export const Consent = () => (
  <label className="flex w-80 min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lot-stone">
    <Checkbox defaultChecked className="mt-0.5" />
    <span>
      For Google, I confirm I am 18 or older, agree to the{" "}
      <a href="#terms" className="text-lot-orange-ink underline underline-offset-2">
        Terms &amp; Conditions
      </a>
      , and acknowledge the{" "}
      <a href="#privacy" className="text-lot-orange-ink underline underline-offset-2">
        Privacy Policy
      </a>
      .
    </span>
  </label>
);

// aria-invalid turns the boundary blocked red; the message carries the meaning.
export const Invalid = () => (
  <div className="flex w-80 flex-col gap-1">
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-lot-ink">
      <Checkbox aria-invalid="true" aria-describedby="consent-error" />
      I agree to the Terms &amp; Conditions
    </label>
    <p id="consent-error" role="alert" className="lf-caption text-status-blocked">
      Accept the terms to continue.
    </p>
  </div>
);

export const Disabled = () => (
  <div className="flex w-80 flex-col">
    <label className="flex min-h-11 cursor-not-allowed items-center gap-3 text-sm text-lot-stone">
      <Checkbox disabled />
      Share my report with builders
    </label>
    <label className="flex min-h-11 cursor-not-allowed items-center gap-3 text-sm text-lot-stone">
      <Checkbox disabled defaultChecked />
      Owner-verified
    </label>
  </div>
);
