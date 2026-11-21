"use client";

import { useId, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { normalizeAgentPassCode } from "@/lib/agent-pass";

/** Props for {@link AgentPassOffer}. */
export interface AgentPassOfferProps {
  /** The code from the agent's link, when the visitor arrived with one. */
  linkedCode: string | null;
  /** Whether a claim is in flight. */
  busy: boolean;
  /** User-facing failure from the last claim, if any. */
  error: string | null;
  /** Whether the visitor is signed in (a free account is required). */
  signedIn: boolean;
  /** Claim the complimentary certificate with `code`. */
  onRedeem: (code: string) => void;
  onClear: () => void;
}

/**
 * The real estate agent pass on the Certificate step. A visitor who arrived on
 * an agent's link sees the complimentary offer outright; anyone else can open
 * "Have an agent code?" and type one. The server decides whether the code
 * covers this property.
 */
export default function AgentPassOffer({ linkedCode, busy, error, signedIn, onRedeem, onClear }: AgentPassOfferProps) {
  const inputId = useId();
  const errorId = useId();
  const [typed, setTyped] = useState("");
  const [typedInvalid, setTypedInvalid] = useState(false);
  const action = signedIn ? "Get this certificate free" : "Create a free account to claim it";
  const message = typedInvalid ? "Enter the code exactly as your agent shared it." : error;

  if (linkedCode) {
    return (
      <section aria-label="Agent code" className="rounded-none border border-lot-line bg-lot-surface px-5 py-4">
        <p className="lf-kicker-dense text-lot-stone">
          Agent code <span translate="no">{linkedCode}</span>
        </p>
        <p className="lf-body-sm mt-1 text-lot-ink">
          Your agent shared a complimentary certificate for this home.
        </p>
        <Button
          className="mt-3"
          variant="secondary"
          fullWidth
          loading={busy}
          aria-describedby={message ? errorId : undefined}
          onClick={() => onRedeem(linkedCode)}
        >
          {action}
        </Button>
        <Button className="mt-2" variant="secondary" disabled={busy} onClick={onClear}>
          Change agent code
        </Button>
        {message && (
          <p id={errorId} role="alert" className="mt-2 flex items-start gap-2 text-xs leading-5 text-status-blocked">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </p>
        )}
      </section>
    );
  }

  return (
    <details className="group border-t border-lot-line">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-2 py-3 text-sm font-semibold text-lot-stone hover:text-lot-ink motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
        Have an agent code?
        <span aria-hidden="true" className="group-open:rotate-45">+</span>
      </summary>
      <form
        className="flex flex-col gap-2 px-2 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          const code = normalizeAgentPassCode(typed);
          setTypedInvalid(!code);
          if (code) {
            onRedeem(code);
          } else {
            document.getElementById(inputId)?.focus();
          }
        }}
      >
        <FieldLabel htmlFor={inputId}>Agent code</FieldLabel>
        <Input
          id={inputId}
          name="agentCode"
          value={typed}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={24}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          onChange={(event) => {
            setTyped(event.target.value);
            setTypedInvalid(false);
          }}
        />
        <Button type="submit" variant="secondary" loading={busy}>
          {signedIn ? "Apply code" : "Create a free account to apply it"}
        </Button>
        {message && (
          <p id={errorId} role="alert" className="flex items-start gap-2 text-xs leading-5 text-status-blocked">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </p>
        )}
      </form>
    </details>
  );
}
