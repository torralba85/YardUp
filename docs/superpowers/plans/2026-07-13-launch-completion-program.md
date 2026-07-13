# LotFoundry Launch Completion Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete LotFoundry web/PWA, iOS App Store app, and Google Play app with member settings, support and feedback, accurate legal surfaces, store-compliant purchases, zero known release-blocking errors, and verified production deployments.

**Architecture:** Keep the Next.js/Firebase web app as the product and data source of truth. Add a shared account/settings layer and shared legal/support surfaces, then route digital purchases through Stripe on the open web, StoreKit on iOS, and Google Play Billing in the Android Trusted Web Activity. Treat native packaging and store submission as separate release artifacts with their own tests and human console gates.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Firebase Auth/Firestore/Functions/Hosting, Stripe, Apple Sign in with Apple + StoreKit 2, Android Trusted Web Activity + Digital Goods API/Play Billing, Vitest, Playwright, Xcode, Bubblewrap.

## Global Constraints

- Default branch is `master`; prove the active branch and worktree before every commit.
- Preserve the existing dirty worktree. Start implementation from a clean worktree based on current `origin/master`, then port intentional local changes deliberately.
- `DESIGN.md` is mandatory for every user-visible surface. Settings, auth, legal, help, and native shells use Golden Hour; green remains money/readiness only, clay is interactive, amber is review-needed, and brick is destructive.
- Clickable controls and nav links use the pill-radius system and at least 44px touch targets; content frames and data chips stay rectangular.
- Do not commit secrets. Apple, Google Play, Firebase, Stripe, and email-provider credentials stay in local env, GitHub secrets, or cloud secret managers.
- Feasibility, income, cost, permit, and AI outputs remain estimates and conceptual aids.
- Terms and Conditions is the same agreement as Terms of Service. Use one canonical `/terms` route and label links `Terms & Conditions` where consumer clarity benefits; do not create a conflicting duplicate agreement.
- Full native parity is the chosen target: web purchases use Stripe, iOS digital purchases use StoreKit, and Android digital purchases use Google Play Billing.
- “Zero errors” means: no open P0/P1 issues, `git diff --check` clean, all release gates green, zero uncaught console errors in critical flows, zero failed production smoke assertions, and no unresolved store-review blockers. It does not mean claiming software can never fail.
- Store submission is complete only when the App Store app is `Ready for Distribution` with target-country availability `Available`, and the Google Play production release is `Available`, not merely when packages are generated.

---

## Audit Snapshot — 2026-07-13

### Verified current state

- Remote release truth: `origin/master` at `27197f1`; GitHub Actions run `29243888968` passed lint, Vitest, TypeScript, build, Playwright, Firebase dry-run, Hosting/Firestore deployment, and Functions deployment.
- GitHub queue: no open pull requests and no open issues at audit time.
- Production HTTP checks: `/`, `/studio`, `/privacy`, and `/terms` return 200. `/about`, `/help`, and `/delete-account` return 404.
- Current local checkout: `master` is 17 commits behind `origin/master`; 35 tracked files are modified, `firestore-debug.log` is staged for deletion, and `.grok/` is untracked.
- Current local `git diff --check` fails on two trailing-space lines in the uncommitted `firestore.rules` edit.
- Local lint, tests, and typecheck are unavailable because `node_modules` is absent. Do not treat that as a source failure; remote `origin/master` is green.
- Obsidian MCP is reachable, but the vault contains only `Untitled.md`; the required `wiki/index.md` does not exist. This plan therefore uses repo and live deployment evidence rather than an invented second-brain history.

### Already present

- Firebase email/password and Google auth, role profiles, password reset, saved scenarios, builder profiles, and in-app account deletion.
- `/privacy` and `/terms` routes, plus legal links on the landing and full-page auth layout.
- PWA manifest, true-size icons, maskable icon, service worker, offline page, and `assetlinks.json` shell.
- Stripe certificate checkout, direct lead unlock, 5-credit and 10-credit packs, webhook grants, and idempotent ledgers.
- CI/CD from `master` to Firebase Hosting, Functions, and Firestore rules.

### Confirmed gaps

| Area | Current result | Required result |
|---|---|---|
| Member settings | Name is display-only; no settings route; no email/security controls; builder profile cannot be reopened from the dashboard | One settings destination for profile, email/security, builder details, data export, help, legal, sign-out, and deletion |
| Account menu | Desktop exposes identity/sign-out/delete; mobile exposes identity/sign-out/delete; builder header exposes sign-out only | Shared menu on owner desktop/mobile and builder surfaces, with Settings, Help, Feedback, Terms & Conditions, Privacy, Sign out, and Delete account |
| Account deletion | In-app deletion exists, but marketplace PII retention is unresolved | Delete/anonymize account-associated PII per an approved retention rule, and provide a public web deletion route required by Google Play |
| Legal accuracy | Privacy names Vercel although production is Firebase and omits Regrid, OpenAI, Stripe, AI-photo handling, marketplace sharing, and retention detail | Counsel-reviewed terms/privacy matching the deployed data and payment flows |
| Support/about/feedback | No `/about`, `/help`, or `/feedback`; support exists only as mailto text in legal pages | Public support center, about page, feedback intake with ticket ID, owned support mailbox, and footer/menu links |
| Auth compliance | Google login exists; Apple login does not; modal sign-up does not show terms/privacy copy | Sign in with Apple, legal copy on every account-creation path, and provider-aware security controls |
| Website completeness | No custom 404/error boundary, robots route, or sitemap | Branded recovery pages and crawl metadata with tests |
| Store deletion compliance | No web deletion-request resource | `/delete-account` works without reinstalling the app and is entered in Play Console |
| Store payments | Native wrapper would expose Stripe digital checkout | Store-channel abstraction: Stripe web, StoreKit iOS, Play Billing Android, with server verification and idempotent grants |
| Native packages | No Android/iOS source package; Play fingerprint is placeholder | Signed Android AAB and iOS archive, native-value features, internal testing, and production listings |
| Store assets/ops | Listing copy is draft; screenshots, feature graphic, review notes, privacy forms, support ownership, and legal review are unfinished | Final assets, accurate forms, reviewer credentials, support SLA, and accepted listings |

### Current store-policy basis

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): payment, login-services, minimum-functionality, privacy, and account-deletion requirements.
- [App Store Connect app and submission statuses](https://developer.apple.com/help/app-store-connect/reference/app-information/app-and-submission-statuses): current distribution and country-availability completion states.
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app): in-app initiation and retention disclosures.
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en): in-app deletion plus a functioning external web resource.
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en): Play Billing requirements for digital in-app functionality.
- [Android Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities?hl=en) and [Play Billing for TWAs](https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing): packaging, Digital Asset Links, Digital Goods API, and billing integration.

## File Structure

### Account and support web workstream

- Create `app/settings/page.tsx`: authenticated Golden Hour settings route.
- Create `components/account/SettingsClient.tsx`: settings sections and status handling.
- Create `components/account/AccountMenu.tsx`: shared owner/builder account menu.
- Create `components/account/ProfileForm.tsx`: name and verified-email controls.
- Create `components/account/SecurityPanel.tsx`: provider-aware password and reauthentication controls.
- Create `components/account/DataExportButton.tsx`: downloads the authenticated account export.
- Create `lib/account-settings.ts`: Firebase profile/email/password actions and capability detection.
- Create `lib/account-settings.test.ts`: unit coverage for provider and validation branches.
- Create `app/api/account/export/route.ts` and `route.test.ts`: authenticated portable JSON export.
- Create `app/delete-account/page.tsx`: public web deletion resource with web sign-in and direct deletion.
- Modify `app/api/account/delete/route.ts` and `route.test.ts`: complete PII teardown and idempotent retries.
- Create `components/legal/SiteFooter.tsx` and `LegalPageShell.tsx`: shared legal/support navigation.
- Create `app/about/page.tsx`, `app/help/page.tsx`, and `app/feedback/page.tsx`.
- Create `app/api/feedback/route.ts`, `route.test.ts`, `lib/feedback.ts`, and `lib/server/feedback-rate-limit.ts`.
- Create `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/robots.ts`, and `app/sitemap.ts`.
- Modify `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/page.tsx`, `components/auth/AuthLayout.tsx`, `components/auth/AuthModal.tsx`, `app/signup/page.tsx`, `components/studio/StudioShell.tsx`, `components/studio/mobile/MobileHeader.tsx`, `components/builder/BuilderDashboard.tsx`, and `components/studio/StyleMatchPanel.tsx`.

### Store commerce and packaging workstream

- Create `lib/commerce/products.ts`: canonical product IDs and entitlement mapping.
- Create `lib/commerce/purchase-channel.ts` and tests: web/iOS/Android channel detection.
- Create `lib/commerce/purchase-client.ts` and tests: Stripe, StoreKit bridge, and Digital Goods API clients.
- Create `app/api/store/purchases/verify/route.ts` and tests: server verification and idempotent grants.
- Create `lib/server/store-purchases.ts` and tests: Apple/Google verification boundaries and ledger writes.
- Modify certificate and builder checkout call sites to use the purchase client.
- Modify `firestore.rules`, `firebase.json`, `functions/index.js`, `scripts/prepare-firebase.js`, CI env wiring, and deployment docs for store secrets and purchase webhooks.
- Create `native/android/`: Bubblewrap TWA project and Play Billing service configuration.
- Create `capacitor.config.ts`, `ios/`, and `native/ios-shell/`: iOS wrapper, StoreKit bridge, native share, camera entry, offline certificate library, and network state.

### Release artifacts

- Create `public/store/` for final screenshots and store graphics.
- Modify `public/manifest.json` and `public/.well-known/assetlinks.json` only after final assets and signing fingerprints exist.
- Modify `docs/store-deployment-readiness.md`, `docs/store-listing-copy.md`, `docs/release-checklist.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/AGENTS.md`, `CHANGELOG.md`, and `TODOS.md` to match shipped behavior.

---

### Task 1: Reconcile the implementation baseline and planning authority

**Files:**
- Modify: `TODOS.md`
- Modify: `docs/store-deployment-readiness.md`
- Reference: `docs/superpowers/plans/*`

**Interfaces:**
- Consumes: current `origin/master`, the preserved dirty worktree, and this audit snapshot.
- Produces: one clean implementation worktree and one authoritative completion register.

- [ ] **Step 1: Preserve and inspect current local work**

Run:

```powershell
git status --short --branch
git diff --stat
git diff --cached --stat
git worktree list --porcelain
```

Expected: the dirty `master` worktree remains untouched and every sibling worktree is visible.

- [ ] **Step 2: Create a clean implementation worktree from current remote master**

Run:

```powershell
git fetch --prune origin
git worktree add C:\tmp\yardup-launch-completion -b codex/launch-completion origin/master
```

Expected: `C:\tmp\yardup-launch-completion` is clean on `codex/launch-completion` and the original worktree still contains all prior edits.

- [ ] **Step 3: Classify historical plans without rewriting their implementation history**

Add this rule to `TODOS.md`:

```markdown
## Planning Authority

`TODOS.md` and `docs/superpowers/plans/2026-07-13-launch-completion-program.md`
are the active launch sources. Older dated plans are implementation/design history;
unchecked boxes in those files do not reopen work already present on `master`.
```

- [ ] **Step 4: Run the clean baseline gate**

Run:

```powershell
npm ci
git diff --check
npm run lint
npm run test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Expected: all commands pass before feature work starts. If a clean `origin/master` gate fails, stop and fix that regression in a separate commit before continuing.

- [ ] **Step 5: Commit the planning baseline**

```powershell
git add TODOS.md docs/store-deployment-readiness.md docs/superpowers/plans/2026-07-13-launch-completion-program.md
git commit -m "docs(plan): define launch completion program"
```

---

### Task 2: Add secure account settings actions and provider capabilities

**Files:**
- Create: `lib/account-settings.ts`
- Create: `lib/account-settings.test.ts`
- Modify: `lib/auth-context.tsx`
- Modify: `lib/auth-context.test.tsx`

**Interfaces:**
- Consumes: Firebase `User`, `auth`, and `users/{uid}` profile documents.
- Produces: `AccountCapabilities`, `updateAccountName`, `changeAccountEmail`, `changeAccountPassword`, `sendVerification`, and `refreshProfile(): Promise<void>`.

- [ ] **Step 1: Write failing capability and validation tests**

```ts
it("marks password accounts as email and password editable", () => {
  expect(getAccountCapabilities([{ providerId: "password" }])).toEqual({
    canChangeEmail: true,
    canChangePassword: true,
    managedBy: "LotFoundry",
  });
});

it("marks Google-only accounts as provider managed", () => {
  expect(getAccountCapabilities([{ providerId: "google.com" }])).toEqual({
    canChangeEmail: false,
    canChangePassword: false,
    managedBy: "Google",
  });
});

it("rejects blank and overlong display names", () => {
  expect(validateDisplayName("  ")).toBe("Enter your name.");
  expect(validateDisplayName("x".repeat(101))).toBe("Name must be 100 characters or fewer.");
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run lib/account-settings.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the account-settings boundary**

```ts
export interface AccountCapabilities {
  canChangeEmail: boolean;
  canChangePassword: boolean;
  managedBy: "LotFoundry" | "Google" | "Apple";
}

export function getAccountCapabilities(
  providers: Array<{ providerId: string }>,
): AccountCapabilities {
  const ids = new Set(providers.map((provider) => provider.providerId));
  if (ids.has("password")) {
    return { canChangeEmail: true, canChangePassword: true, managedBy: "LotFoundry" };
  }
  if (ids.has("apple.com")) {
    return { canChangeEmail: false, canChangePassword: false, managedBy: "Apple" };
  }
  return { canChangeEmail: false, canChangePassword: false, managedBy: "Google" };
}

export function validateDisplayName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Enter your name.";
  if (name.length > 100) return "Name must be 100 characters or fewer.";
  return null;
}
```

Implement mutations with Firebase `updateProfile`, `verifyBeforeUpdateEmail`, `updatePassword`, and recent-login reauthentication. Mirror name/email changes into `users/{uid}` with `serverTimestamp()` and refresh the Auth context only after both writes succeed.

- [ ] **Step 4: Add Auth context methods and tests**

Extend `AuthContextType` with:

```ts
updateAccountName: (displayName: string) => Promise<void>;
changeAccountEmail: (email: string, currentPassword: string) => Promise<void>;
changeAccountPassword: (currentPassword: string, nextPassword: string) => Promise<void>;
sendVerification: () => Promise<void>;
refreshProfile: () => Promise<void>;
```

Expected tests: profile state updates after a successful name write; rejected Firebase writes leave the prior profile intact; provider-managed accounts never request a password.

- [ ] **Step 5: Run focused verification**

Run: `npx vitest run lib/account-settings.test.ts lib/auth-context.test.tsx && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/account-settings.ts lib/account-settings.test.ts lib/auth-context.tsx lib/auth-context.test.tsx
git commit -m "feat(account): add secure member settings actions"
```

---

### Task 3: Build the settings route and shared member menu

**Files:**
- Create: `app/settings/page.tsx`
- Create: `components/account/SettingsClient.tsx`
- Create: `components/account/SettingsClient.test.tsx`
- Create: `components/account/AccountMenu.tsx`
- Create: `components/account/AccountMenu.test.tsx`
- Create: `components/account/ProfileForm.tsx`
- Create: `components/account/SecurityPanel.tsx`
- Create: `components/account/DataExportButton.tsx`
- Modify: `components/studio/StudioShell.tsx`
- Modify: `components/studio/mobile/MobileHeader.tsx`
- Modify: `components/builder/BuilderDashboard.tsx`

**Interfaces:**
- Consumes: Task 2 account methods and existing `DeleteAccountButton`.
- Produces: `/settings` and a shared `AccountMenu` usable in owner and builder shells.

- [ ] **Step 1: Write failing route/menu tests**

```tsx
it("shows every launch-required account action", () => {
  render(<SettingsClient />);
  expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /security/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /get help/i })).toHaveAttribute("href", "/help");
  expect(screen.getByRole("link", { name: /send feedback/i })).toHaveAttribute("href", "/feedback");
  expect(screen.getByRole("button", { name: /export my data/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
});
```

`AccountMenu` must expose Settings, Get help, Send feedback, Terms & Conditions, Privacy, Sign out, and Delete account with 44px targets and keyboard navigation.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run components/account/SettingsClient.test.tsx components/account/AccountMenu.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the authenticated settings route**

```tsx
export default function SettingsPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-lf-sand text-lf-espresso">
      <SettingsClient />
    </main>
  );
}
```

`SettingsClient` renders Profile, Security, Builder profile (builders only), Your data, Help & feedback, Legal, and Danger zone. Signed-out visitors receive a sign-in action and return to `/settings` after authentication.

- [ ] **Step 4: Replace duplicated account controls**

Use the same component in all three shells:

```tsx
<AccountMenu
  displayName={displayName}
  roleLabel={roleLabel}
  onSignOut={() => void logout()}
/>
```

Do not leave a builder-only sign-out dead end or separate mobile menu behavior.

- [ ] **Step 5: Add responsive Playwright coverage**

Create `e2e/account-settings.spec.ts` covering desktop and mobile: open account menu, navigate to settings, edit display name in a mocked/auth test state, visit Help/Feedback/Terms/Privacy, cancel deletion, and return to studio/builder.

Run: `npx playwright test e2e/account-settings.spec.ts --project=desktop-chromium --project=mobile-chromium`

Expected: PASS with no accessibility or console errors.

- [ ] **Step 6: Commit**

```powershell
git add app/settings components/account components/studio/StudioShell.tsx components/studio/mobile/MobileHeader.tsx components/builder/BuilderDashboard.tsx e2e/account-settings.spec.ts
git commit -m "feat(account): add member settings and shared account menu"
```

---

### Task 4: Add Sign in with Apple and complete account-creation disclosures

**Files:**
- Modify: `lib/auth-context.tsx`
- Modify: `lib/auth-context.test.tsx`
- Modify: `components/auth/AuthModal.tsx`
- Modify: `components/auth/AuthModal.test.tsx`
- Modify: `app/signup/page.tsx`
- Modify: `app/login/LoginForm.tsx`
- Modify: `README.md`
- Modify: `docs/deployment.md`

**Interfaces:**
- Consumes: Firebase Auth Apple provider configuration supplied through Apple/Firebase consoles.
- Produces: `signInWithApple(role?: UserRole): Promise<UserCredential>` and equal legal disclosure on every signup surface.

- [ ] **Step 1: Write failing Apple-provider tests**

```ts
it("requests only name and email from Apple", async () => {
  await result.current.signInWithApple("user");
  expect(oauthProvider).toHaveBeenCalledWith("apple.com");
  expect(addScope).toHaveBeenCalledWith("email");
  expect(addScope).toHaveBeenCalledWith("name");
});
```

Add UI tests asserting Apple, Google, and email/password are present and signup copy links to `/terms` and `/privacy` in both the full page and modal.

- [ ] **Step 2: Implement Apple authentication**

```ts
const signInWithApple = async (role: UserRole = "user") => {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  pendingAuthRoleRef.current = role;
  try {
    const cred = await signInWithPopup(auth, provider);
    await ensureProfile(cred.user, { role });
    return cred;
  } finally {
    pendingAuthRoleRef.current = null;
  }
};
```

- [ ] **Step 3: Add the exact signup disclosure everywhere**

```tsx
<p className="lf-caption text-lf-taupe">
  By creating an account, you agree to our{" "}
  <Link href="/terms">Terms &amp; Conditions</Link> and{" "}
  <Link href="/privacy">Privacy Policy</Link>.
</p>
```

- [ ] **Step 4: Complete human provider configuration**

In Apple Developer and Firebase consoles: register `com.lotfoundry.app`, create the Sign in with Apple service ID/key, configure the Firebase callback URL, enable the Apple provider, and store the private key outside git.

Expected: Apple sandbox login creates or reuses the same Firebase profile and respects private relay email.

- [ ] **Step 5: Run focused verification and commit**

Run: `npx vitest run lib/auth-context.test.tsx components/auth/AuthModal.test.tsx && npx tsc --noEmit`

```powershell
git add lib/auth-context.tsx lib/auth-context.test.tsx components/auth/AuthModal.tsx components/auth/AuthModal.test.tsx app/signup/page.tsx app/login/LoginForm.tsx README.md docs/deployment.md
git commit -m "feat(auth): add Apple login and signup disclosures"
```

---

### Task 5: Complete account deletion, data export, and the public deletion resource

**Files:**
- Modify: `app/api/account/delete/route.ts`
- Modify: `app/api/account/delete/route.test.ts`
- Create: `app/api/account/export/route.ts`
- Create: `app/api/account/export/route.test.ts`
- Create: `app/delete-account/page.tsx`
- Create: `app/delete-account/DeleteAccountPageClient.tsx`
- Modify: `components/studio/DeleteAccountButton.tsx`
- Modify: `firestore.rules`
- Modify: `docs/store-listing-copy.md`

**Interfaces:**
- Consumes: authenticated uid and Firestore account-owned records.
- Produces: `{ deleted: true }`, portable JSON export, and a web deletion path usable after uninstall.

- [ ] **Step 1: Write failing deletion-completeness tests**

```ts
it("removes homeowner PII while retaining non-PII purchase records", async () => {
  ops.connectionRequests = [{ id: "lead-1", ownerUid: "local-dev" }];
  const res = await POST(postRequest());
  expect(res.status).toBe(200);
  expect(ops.deletedPrivateContacts).toEqual(["lead-1"]);
  expect(ops.deletedLeadUnlocks).toEqual([]);
});

it("is safe to retry after account data is already gone", async () => {
  ops.userExists = false;
  expect((await POST(postRequest())).status).toBe(200);
});
```

The approved default retention rule is: delete homeowner contact/address and user-generated content; retain redacted lead roots, transaction IDs, amounts, and fraud/accounting records without direct contact PII. Legal counsel may require a narrower retention window, but may not expand retained PII silently.

- [ ] **Step 2: Implement bounded, idempotent teardown**

Delete saved scenarios, builder profile/contact fields, `connectionRequests/*/private/contact` owned by the uid, user profile, and Firebase Auth identity. Keep redacted lead and payment ledgers. Return success when already absent.

- [ ] **Step 3: Implement authenticated JSON export**

Return this stable shape:

```ts
export interface AccountExport {
  exportedAt: string;
  profile: UserProfile | null;
  savedScenarios: unknown[];
  builderProfile: BuilderProfile | null;
  connectionRequests: Array<{ id: string; preview: unknown; status: string }>;
  purchaseLedger: unknown[];
}
```

Never include other users' PII, Firebase tokens, Stripe secrets, or raw provider credentials.

- [ ] **Step 4: Build `/delete-account`**

The page must name LotFoundry, explain exactly what is deleted/retained, let signed-in users complete deletion with the existing two-step confirmation, provide login/password-reset options, and link `support@lotfoundry.com` only as a fallback. It must not require reinstalling a native app.

- [ ] **Step 5: Verify rules and user flows**

Run:

```powershell
npx vitest run app/api/account/delete/route.test.ts app/api/account/export/route.test.ts
npx playwright test e2e/account-settings.spec.ts
npm run deploy:dry-run
```

Expected: all pass; direct client reads of export/deletion admin data remain denied.

- [ ] **Step 6: Commit**

```powershell
git add app/api/account app/delete-account components/studio/DeleteAccountButton.tsx firestore.rules docs/store-listing-copy.md
git commit -m "feat(account): complete deletion and data portability"
```

---

### Task 6: Add About, Help, Feedback, and accurate legal surfaces

**Files:**
- Create: `components/legal/LegalPageShell.tsx`
- Create: `components/legal/SiteFooter.tsx`
- Create: `app/about/page.tsx`
- Create: `app/help/page.tsx`
- Create: `app/feedback/page.tsx`
- Create: `app/api/feedback/route.ts`
- Create: `app/api/feedback/route.test.ts`
- Create: `lib/feedback.ts`
- Create: `lib/server/feedback-rate-limit.ts`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/page.tsx`
- Modify: `components/auth/AuthLayout.tsx`
- Modify: `components/studio/StyleMatchPanel.tsx`
- Modify: corresponding tests

**Interfaces:**
- Consumes: optional Firebase bearer token and request metadata.
- Produces: `POST /api/feedback` accepting `{ category, message, email?, page?, company? }` and returning `{ ticketId }`.

- [ ] **Step 1: Write failing feedback validation tests**

```ts
expect(validateFeedback({ category: "bug", message: "Map is blank", company: "" })).toEqual({
  ok: true,
  value: { category: "bug", message: "Map is blank", email: null, page: null },
});
expect(validateFeedback({ category: "bug", message: "x", company: "" })).toEqual({
  ok: false,
  error: "Tell us a little more (at least 10 characters).",
});
```

The hidden `company` honeypot returns a generic success without writing. Limit public submissions to 3 per IP hash per hour; authenticated uid is stored when available.

- [ ] **Step 2: Implement feedback persistence**

```ts
await db.collection("feedback").add({
  category: value.category,
  message: value.message,
  email: value.email,
  page: value.page,
  uid: auth?.uid ?? null,
  status: "new",
  createdAt: FieldValue.serverTimestamp(),
});
```

Client Firestore access to `feedback` stays denied; only the server route writes. Return the document ID as the ticket ID.

- [ ] **Step 3: Build public information routes**

- `/about`: product purpose, estimate-honest scope, supported users, and contact links without invented founder/team claims.
- `/help`: getting started, account/settings, saved concepts, payments, builder leads, AI photo handling, deletion, and direct support email.
- `/feedback`: Bug, Idea, Data issue, Billing, and Other categories; success state shows the ticket ID.

- [ ] **Step 4: Correct privacy and terms**

Privacy must name Firebase Hosting/Auth/Firestore/Functions, Google Maps/Places, Regrid, OpenAI, and Stripe; explain AI-photo transit/no LotFoundry persistence; explain builder-sharing consent; enumerate retention/deletion; link `/delete-account`; and remove Vercel. Terms must cover AI concepts, marketplace leads, certificate/credit purchases, store billing, refunds/credits, data accuracy, acceptable use, and estimates. Mark both `Last updated: July 13, 2026` and require legal review before store submission.

- [ ] **Step 5: Add explicit AI sharing consent**

Before the first photo upload/generation, require:

```tsx
<label>
  <input type="checkbox" checked={aiConsent} onChange={handleConsent} />
  I agree to send this photo to OpenAI to generate a concept. LotFoundry does not store the original photo.
</label>
```

Generation stays disabled until consent; declining does not block the rest of the studio.

- [ ] **Step 6: Use one shared footer/navigation set**

Every public/footer and account menu exposes About, Help, Feedback, Terms & Conditions, Privacy, and Delete account. Do not leave legal routes with separate drifting footer markup.

- [ ] **Step 7: Verify and commit**

Run: `npx vitest run app/api/feedback/route.test.ts components/studio/StyleMatchPanel.test.tsx && npx playwright test e2e/legal-support.spec.ts`

```powershell
git add app/about app/help app/feedback app/api/feedback app/privacy app/terms app/page.tsx components/legal components/auth/AuthLayout.tsx components/studio/StyleMatchPanel.tsx lib/feedback.ts lib/server/feedback-rate-limit.ts e2e/legal-support.spec.ts
git commit -m "feat(support): add help feedback about and legal coverage"
```

---

### Task 7: Add standard website recovery, crawl, and accessibility surfaces

**Files:**
- Create: `app/not-found.tsx`
- Create: `app/error.tsx`
- Create: `app/global-error.tsx`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`
- Create: `e2e/site-completeness.spec.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_APP_URL` with `https://yardup-2026.web.app` fallback.
- Produces: branded recovery UI, crawl metadata, and stable public-route smoke coverage.

- [ ] **Step 1: Write failing route tests**

```ts
for (const path of ["/", "/about", "/help", "/feedback", "/privacy", "/terms", "/delete-account"]) {
  test(`${path} loads without console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 2: Implement branded error recovery**

`not-found.tsx` links Home, Start a feasibility study, and Get help. `error.tsx` and `global-error.tsx` expose Retry and Get help, log the supplied error once, and preserve a usable document shell.

- [ ] **Step 3: Implement robots and sitemap**

```ts
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/builder", "/settings"] }, sitemap: `${baseUrl}/sitemap.xml` };
}
```

Sitemap includes only public routes and excludes authenticated dashboards/API routes.

- [ ] **Step 4: Verify and commit**

Run: `npx playwright test e2e/site-completeness.spec.ts && npm run build`

```powershell
git add app/not-found.tsx app/error.tsx app/global-error.tsx app/robots.ts app/sitemap.ts app/layout.tsx e2e/site-completeness.spec.ts
git commit -m "feat(web): add recovery and crawl surfaces"
```

---

### Task 8: Add store-compliant purchase channels and verified grants

**Files:**
- Create: `lib/commerce/products.ts`
- Create: `lib/commerce/purchase-channel.ts`
- Create: `lib/commerce/purchase-channel.test.ts`
- Create: `lib/commerce/purchase-client.ts`
- Create: `lib/commerce/purchase-client.test.ts`
- Create: `lib/server/store-purchases.ts`
- Create: `lib/server/store-purchases.test.ts`
- Create: `app/api/store/purchases/verify/route.ts`
- Create: `app/api/store/purchases/verify/route.test.ts`
- Modify: certificate, direct-unlock, and credit-shop call sites
- Modify: `firestore.rules`, `functions/index.js`, `firebase.json`, deployment env/docs

**Interfaces:**
- Consumes: authenticated uid and one platform transaction token/JWS.
- Produces: `PurchaseGrant { id, uid, platform, productId, credits, certificateCredits, createdAt }` exactly once.

- [ ] **Step 1: Define immutable product IDs**

```ts
export const STORE_PRODUCTS = {
  certificate: { id: "com.lotfoundry.certificate.credit1", certificateCredits: 1, leadCredits: 0 },
  builder5: { id: "com.lotfoundry.builder.credits5", certificateCredits: 0, leadCredits: 5 },
  builder10: { id: "com.lotfoundry.builder.credits10", certificateCredits: 0, leadCredits: 10 },
} as const;
```

Direct lead unlock in native apps consumes one lead credit. Web keeps Stripe direct unlock and Stripe credit packs.

- [ ] **Step 2: Write failing channel tests**

```ts
expect(detectPurchaseChannel({ getDigitalGoodsService: vi.fn() })).toBe("google-play");
expect(detectPurchaseChannel({ webkit: { messageHandlers: { lotfoundryStore: {} } } })).toBe("app-store");
expect(detectPurchaseChannel({})).toBe("web");
```

- [ ] **Step 3: Implement channel-specific purchase clients**

```ts
export type PurchaseChannel = "web" | "app-store" | "google-play";
export interface PurchaseReceipt { platform: PurchaseChannel; productId: string; token: string }
export interface PurchaseClient { purchase(productId: string): Promise<PurchaseReceipt> }
```

The web client calls existing Stripe routes. The Google client uses `getDigitalGoodsService("https://play.google.com/billing")` + `PaymentRequest`. The iOS client posts to `window.webkit.messageHandlers.lotfoundryStore` and resolves a callback carrying the StoreKit signed transaction JWS.

- [ ] **Step 4: Verify receipts on the server before granting value**

Use `@apple/app-store-server-library` for Apple signed transaction verification and Google Play Developer API for Android purchase tokens. Key idempotency by `platform:transactionId`; never trust client-supplied credit counts or price.

```ts
await db.runTransaction(async (transaction) => {
  const grantRef = db.doc(`purchaseGrants/${platform}:${transactionId}`);
  if ((await transaction.get(grantRef)).exists) return;
  transaction.create(grantRef, verifiedGrant);
  transaction.update(entitlementRef, entitlementDelta);
});
```

- [ ] **Step 5: Add refund/revocation handling**

Configure App Store Server Notifications and Google Real-time Developer Notifications to call platform-specific Functions handlers. Revocations create compensating ledger entries; balances never become negative; consumed lead access is flagged for support review rather than silently hiding purchased business records.

- [ ] **Step 6: Run security tests**

Cover invalid signature, wrong bundle/package ID, wrong product ID, replayed token, mismatched uid/app-account token, revoked purchase, and concurrent duplicate delivery.

Run: `npx vitest run lib/commerce lib/server/store-purchases.test.ts app/api/store/purchases/verify/route.test.ts`

Expected: PASS; every replay grants value once.

- [ ] **Step 7: Commit**

```powershell
git add lib/commerce lib/server/store-purchases.ts lib/server/store-purchases.test.ts app/api/store firestore.rules functions/index.js firebase.json docs/deployment.md
git commit -m "feat(commerce): add verified app store purchase channels"
```

---

### Task 9: Package and test the Android Trusted Web Activity

**Files:**
- Create: `native/android/**`
- Modify: `public/.well-known/assetlinks.json`
- Modify: `public/manifest.json`
- Modify: `package.json`
- Modify: `docs/store-deployment-readiness.md`

**Interfaces:**
- Consumes: production HTTPS PWA, manifest, real Play signing fingerprint, and Task 8 Google purchase client.
- Produces: signed `com.lotfoundry.app` Android App Bundle with verified Digital Asset Links and Play Billing.

- [ ] **Step 1: Generate the TWA project**

Run:

```powershell
npx @bubblewrap/cli init --manifest=https://yardup-2026.web.app/manifest.json --directory=native/android
```

Use package `com.lotfoundry.app`, app name `LotFoundry`, start URL `/studio`, and minimum Android version supported by current Play policy. Commit generated source, never signing keys.

- [ ] **Step 2: Configure Play products and billing service**

Create the three Task 8 product IDs in Play Console. Configure Bubblewrap/Android Browser Helper billing service, then verify the Digital Goods API is available only inside the installed Play build and web Stripe remains active in normal browsers.

- [ ] **Step 3: Replace the asset-links placeholder**

```json
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.lotfoundry.app",
    "sha256_cert_fingerprints": ["REAL_PLAY_APP_SIGNING_SHA256"]
  }
}
```

The literal placeholder must not remain in committed release artifacts. Validate with Google's Digital Asset Links API and confirm the app opens without Custom Tab chrome.

- [ ] **Step 4: Add Android device tests**

On phone and tablet internal-track installs: sign up/sign in, open settings/help/legal, delete a test account, search a parcel, save/load a scenario, upload a photo with consent, buy a sandbox certificate credit, buy and consume builder credits, restore entitlements, test offline launch, and verify back-button behavior.

- [ ] **Step 5: Build and commit**

Run:

```powershell
Push-Location native/android
.\gradlew.bat test bundleRelease
Pop-Location
```

Expected: unit tests pass and `app-release.aab` is produced outside git.

```powershell
git add native/android public/.well-known/assetlinks.json public/manifest.json package.json docs/store-deployment-readiness.md
git commit -m "feat(android): add Play-ready trusted web activity"
```

---

### Task 10: Package and test the iOS app with native value and StoreKit

**Files:**
- Create: `capacitor.config.ts`
- Create: `native/ios-shell/index.html`
- Create: `ios/**`
- Create: `ios/App/App/LotFoundryStorePlugin.swift`
- Create: `ios/App/App/NativeSharePlugin.swift`
- Create: `ios/App/App/OfflineCertificateStore.swift`
- Modify: web share/photo/certificate entry points
- Modify: `package.json`

**Interfaces:**
- Consumes: production HTTPS app, Task 8 StoreKit bridge, and generated certificate exports.
- Produces: signed iPhone/iPad archive `com.lotfoundry.app` with StoreKit purchases, native share, native photo picker handoff, offline certificate access, and explicit offline/network UI.

- [ ] **Step 1: Initialize the iOS wrapper**

Run from a clean repo-root worktree:

```powershell
npm install @capacitor/core@8.4.1 @capacitor/ios@8.4.1
npm install --save-dev @capacitor/cli@8.4.1
npx cap init LotFoundry com.lotfoundry.app --web-dir native/ios-shell
npx cap add ios
```

Keep the local bootstrap shell in `native/ios-shell`. Production navigation targets the canonical HTTPS domain; development server settings must never ship in the archive. Recheck the pinned Capacitor release against its current Node, Xcode, and iOS support matrix before installation if execution occurs after this plan date.

- [ ] **Step 2: Implement the StoreKit 2 bridge**

`LotFoundryStorePlugin.swift` must fetch the Task 8 product IDs, present StoreKit purchase UI, verify the transaction locally, return the signed JWS to the web layer, and finish only after the server verification route succeeds. Use an app-account token derived from the authenticated uid so server grants cannot cross accounts.

- [ ] **Step 3: Add native value beyond a repackaged website**

- Native share sheet for certificate/report links and exported files.
- Native photo picker/camera handoff for style match, with the same OpenAI consent gate.
- Offline certificate library storing only user-selected exports on device with Remove action.
- Native network/offline state that keeps saved certificates available and never shows a blank web view.

These features are release requirements because Apple Guideline 4.2 rejects apps that are only repackaged websites.

- [ ] **Step 4: Add iOS privacy and capability declarations**

Provide accurate photo/camera purpose strings, no tracking declaration, associated domains only for owned domains, Sign in with Apple capability, and StoreKit configuration for sandbox tests. Do not request full photo-library access when the system picker is sufficient.

- [ ] **Step 5: Run native tests and TestFlight QA**

Run Xcode unit/UI tests on current iPhone and iPad simulators, then TestFlight on at least one real iPhone and iPad. Exercise every account, parcel, AI consent, purchase, restore, deletion, support, legal, share, and offline flow. Capture zero-crash/zero-console-error evidence for review notes.

- [ ] **Step 6: Commit**

```powershell
git add capacitor.config.ts native/ios-shell ios package.json components lib
git commit -m "feat(ios): add StoreKit native LotFoundry shell"
```

---

### Task 11: Finalize store assets, privacy forms, release gates, and submissions

**Files:**
- Create: `public/store/**`
- Modify: `public/manifest.json`
- Modify: `docs/store-listing-copy.md`
- Modify: `docs/store-deployment-readiness.md`
- Modify: `docs/release-checklist.md`
- Modify: `TODOS.md`
- Modify: `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/AGENTS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: signed AAB/IPA, production web deploy, final screenshots, legal approval, support ownership, and console access.
- Produces: accepted App Store and Google Play production listings plus an auditable release record.

- [ ] **Step 1: Complete human launch decisions and ownership**

Verify the canonical production domain, support mailbox owner and response SLA, legal entity/developer accounts, tax/banking agreements, privacy counsel sign-off, marketplace PII retention, refund/credit policy, Play/App Store product pricing, and builder support operations. Record the decisions in `docs/store-deployment-readiness.md`; never put secrets there.

- [ ] **Step 2: Capture and validate assets**

Capture iPhone 6.7-inch, iPad 12.9-inch, Android phone, and Android tablet flows from release candidates. Export the 1024x1024 App Store icon, 512x512 Play icon, and 1024x500 Play feature graphic. Check final images into `public/store/`, then add exact `screenshots` entries to `public/manifest.json`.

- [ ] **Step 3: Complete store disclosures**

Enter `/privacy` as privacy URL, `/help` as support URL, `/delete-account` as Google deletion URL, and the canonical landing as marketing URL. Declare email/name/avatar, property address, saved scenarios, uploaded photos sent to OpenAI, purchase history, user ID, and diagnostics exactly as deployed. Declare no tracking unless new SDK behavior proves otherwise.

- [ ] **Step 4: Run the full clean release gate**

```powershell
npm ci
git diff --check
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
npm run build:firebase
npm run deploy:dry-run
FIREBASE_SMOKE_EMAIL=<test-user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase
```

Expected: every command passes. Then run Android Gradle tests/bundle and Xcode tests/archive from Tasks 9 and 10.

- [ ] **Step 5: Deploy web and verify production**

Merge only with green CI. After the `master` deploy completes, verify `/`, `/studio`, `/builder`, `/settings`, `/about`, `/help`, `/feedback`, `/privacy`, `/terms`, `/delete-account`, API health, Firebase smoke, Stripe web sandbox/live checks, Apple sandbox receipt verification, and Google Play internal-track purchase verification. Record run IDs and smoke results in the release PR.

- [ ] **Step 6: Submit both stores**

Upload the AAB to Play production through staged rollout after internal/closed testing. Upload the iOS archive, attach review credentials and review notes explaining estimates, AI consent, account deletion, native value, and purchase channels, then submit. Resolve every review finding with a tracked commit and rerun the relevant gate.

- [ ] **Step 7: Confirm actual availability**

Completion evidence must include:

```markdown
- Web production URL and successful Firebase deploy run ID
- App Store listing URL, app status: Ready for Distribution, and target-country status: Available
- Google Play listing URL and production status: Available
- Release commit/tag
- Full gate results
- Live account deletion result
- Live support/feedback ticket result
- Store purchase and restore result for each platform
- Zero open P0/P1 issues
```

- [ ] **Step 8: Close the completion register and commit release docs**

Mark only verified items complete in `TODOS.md`, leave human/operational follow-ups explicit, and archive superseded old plans with replacement headers rather than rewriting their historical checkboxes.

```powershell
git add public/store public/manifest.json docs README.md CLAUDE.md AGENTS.md TODOS.md CHANGELOG.md
git commit -m "docs(release): record app store launch completion"
```

---

## Final Acceptance Checklist

- [ ] Shared settings/member menu works for homeowners and builders on desktop and mobile.
- [ ] Profile, verified email/security, provider state, data export, help, feedback, legal links, sign-out, and deletion are usable and tested.
- [ ] Apple, Google, and email/password authentication paths are tested; every signup path shows Terms & Conditions and Privacy.
- [ ] `/about`, `/help`, `/feedback`, `/privacy`, `/terms`, and `/delete-account` are accurate, reachable, accessible, and live.
- [ ] Account deletion removes account-associated PII and documents lawful non-PII retention; Google web deletion and Apple in-app deletion requirements are satisfied.
- [ ] AI photo sharing is explicitly consented to and the privacy policy matches actual processing.
- [ ] Web Stripe, iOS StoreKit, and Android Play Billing grants are verified server-side and idempotent.
- [ ] Android TWA verifies Digital Asset Links, works offline as designed, passes device QA, and is available on Google Play.
- [ ] iOS app adds native value, passes device/TestFlight QA, and is ready for sale on the App Store.
- [ ] All automated/manual release gates pass with no unresolved P0/P1 issues or critical console errors.
- [ ] Documentation, listing copy, privacy forms, screenshots, support ownership, and release evidence match production.

## Self-Review Result

- Spec coverage: member settings, profile changes, help, deletion, About, Feedback, Terms & Conditions, Privacy, common website recovery/navigation, full functionality, error gates, web deployment, and both app stores are mapped to tasks.
- Completeness scan: every change step names its deliverable, validation, and failure boundary. Human-only console values are explicit release inputs and are forbidden from docs/git.
- Type consistency: `AccountCapabilities`, `PurchaseChannel`, `PurchaseReceipt`, `PurchaseClient`, `PurchaseGrant`, and `AccountExport` are defined before downstream use with stable names.
- Scope boundary: older product bets such as solar simulation, financing models, and CRM analytics are not launch blockers unless separately approved; this plan targets complete operation of the current product and required launch surfaces.
