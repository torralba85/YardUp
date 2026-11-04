import { useState } from "react";
import { Button, Checkbox, Dialog, Lock } from "@lotfoundry/ui";

// Dialog portals to body and covers the page with the carbon scrim, so the
// card shows one open dialog. Render it only while open; onClose closes it.

// The builder unlock slip: kicker, title, description, a summary block and a
// pinned footer carrying the one primary action.
export const PurchaseSlip = () => (
  <Dialog
    title="Unlock this lead"
    kicker="Unlock slip · LF-2611-0417"
    description="One-time purchase. The homeowner is notified that Coastal ADU Builders has their report."
    onClose={() => undefined}
    initialFocus="none"
    size="md"
    footer={
      <>
        <Button variant="commit" fullWidth leftIcon={<Lock size={16} />}>
          Pay $49 and unlock
        </Button>
        <p className="mt-3 text-center lf-kicker-dense text-lot-stone">Receipt emailed · Secure checkout</p>
      </>
    }
  >
    <div className="border border-lot-line bg-lot-surface px-4 py-3.5">
      <p className="font-semibold text-lot-ink">North Park, San Diego</p>
      <p className="mt-1 flex flex-wrap gap-3.5 lf-kicker-dense text-lot-stone">
        <span>6,250 sqft lot</span>
        <span>750 sf ADU</span>
        <span>Owner-verified</span>
      </p>
      <p className="mt-2 lf-money-lg text-lot-ink">
        $2,650
        <span className="ml-1.5 lf-kicker-dense text-lot-stone">/mo rent potential</span>
      </p>
    </div>
    <ul className="mt-4 ml-4 list-disc text-sm text-lot-ink marker:text-lot-stone">
      <li className="my-1.5">The homeowner&apos;s name, email and phone</li>
      <li className="my-1.5">The full feasibility certificate for the lot</li>
    </ul>
  </Dialog>
);

// A blocking dialog: no onClose, so there is no close button and Escape and
// the scrim do nothing until the person accepts or signs out.
export const BlockingConsent = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Dialog
      title="We updated our Terms and Privacy Policy"
      kicker="Legal update"
      initialFocus="none"
      size="md"
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="primary" fullWidth disabled={!checked}>
            Accept and continue
          </Button>
          <Button variant="secondary" fullWidth>
            Sign out
          </Button>
        </div>
      }
    >
      <p className="lf-body-sm mb-6 text-lot-stone">
        Please review and accept the updated Terms &amp; Conditions and Privacy Policy (effective October 30, 2026) to
        keep using your account.
      </p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 lf-body-sm text-lot-stone">
        <Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-0.5" />
        <span>
          I confirm I am 18 or older and agree to the{" "}
          <a href="#terms" className="text-lot-orange-ink underline underline-offset-2">
            Terms &amp; Conditions
          </a>{" "}
          and the{" "}
          <a href="#privacy" className="text-lot-orange-ink underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </span>
      </label>
    </Dialog>
  );
};
