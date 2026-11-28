"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore, type MouseEventHandler, type ReactNode } from "react";
import { WebBuilderOnly } from "@/components/builder/WebBuilderOnly";
import { Button } from "@/components/ui/Button";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { PRIMARY_CTA_LABEL, SITE_NAV_LINKS } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

// The header is page-level chrome, so it remounts on every navigation and the
// path only needs reading once per mount. Reading `location` directly (rather
// than `usePathname`) keeps it free of the router context; the server snapshot
// is null, so prerendered HTML marks no link current and hydration fills it in.
const noSubscribe = () => () => {};
const readPathname = () => window.location.pathname;
const serverPathname = () => null;

function isCurrent(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared site header for the landing, editorial pages and account flows. The brand
 * lockup links home, the main menu sits inline from 1100px and behind a menu
 * button below it (design-system §7 Nav: `aria-expanded`/`aria-controls`,
 * Escape closes and returns focus to the trigger).
 *
 * @param props.actions - Trailing page action (Open studio, account menu…).
 * @param props.width - Container width class; matches the page's own header.
 */
export function SiteHeader({
  actions,
  width = "max-w-6xl",
  landing = false,
  member,
  onStart,
  showLotAction = true,
  signInHref = "/login",
}: {
  actions?: ReactNode;
  width?: string;
  landing?: boolean;
  member?: ReactNode;
  showLotAction?: boolean;
  signInHref?: string;
  onStart?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const pathname = useSyncExternalStore(noSubscribe, readPathname, serverPathname);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);

  const linkClass = (current: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-control px-2 text-sm motion-safe:transition-colors hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink",
      current ? "font-semibold text-lot-ink underline decoration-lot-orange-ink underline-offset-4" : "font-medium text-lot-ink",
    );

  const builderLink = (
    <WebBuilderOnly>
      <li><Link href="/signup?role=builder" prefetch={false} className={linkClass(false)} onClick={() => setOpen(false)}>Register as a builder</Link></li>
    </WebBuilderOnly>
  );
  const signIn = !actions && !member && pathname !== "/login" && (
    <Link href={signInHref} prefetch={false} className={linkClass(false)} onClick={() => setOpen(false)}>Sign in</Link>
  );

  return (
    <header
      className={cn("relative border-b border-lot-line bg-lot-chalk", landing && "absolute inset-x-0 top-0 z-20 border-lot-chalk/30 bg-transparent [&>div]:text-lot-chalk [&>div>nav_a]:text-inherit [&>div>div>span>a]:text-inherit [&>div>div>button]:text-inherit")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className={cn("mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-6", width)}>
        <Link
          href="/"
          aria-label="LotFoundry home"
          className="flex min-h-11 shrink-0 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          <BrandLockup inverse={landing} className="h-5 w-auto min-[360px]:h-6 sm:h-7" />
        </Link>

        <nav aria-label="Main navigation" className="hidden min-[1100px]:block">
          <ul className="flex items-center gap-1">
            {SITE_NAV_LINKS.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={linkClass(current)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {builderLink}
          </ul>
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          {member || actions || <span className="hidden min-[1100px]:inline-flex">{signIn}</span>}
          {showLotAction && (!actions || member) && (
            <Link href={landing ? "#start" : "/studio"} prefetch={false} onClick={onStart}
              className={cn("inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-control bg-lot-orange px-3 text-sm font-semibold text-lot-ink hover:bg-lot-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2", member && "max-[439px]:hidden")}>
              {PRIMARY_CTA_LABEL}
            </Link>
          )}
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="sm"
            className="min-w-11 px-2 min-[1100px]:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav
          id={menuId}
          aria-label="Mobile navigation"
          className="border-t border-lot-line bg-lot-chalk min-[1100px]:hidden"
        >
          <ul className={cn("mx-auto flex flex-col divide-y divide-lot-line px-4 py-2 sm:px-6", width)}>
            {SITE_NAV_LINKS.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(linkClass(current), "flex w-full text-base")}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {builderLink}
            {signIn && <li>{signIn}</li>}
            {member && showLotAction && (
              <li className="min-[440px]:hidden">
                <Link href={landing ? "#start" : "/studio"} prefetch={false} className={linkClass(false)}
                  onClick={event => { setOpen(false); onStart?.(event); }}>{PRIMARY_CTA_LABEL}</Link>
              </li>
            )}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export { SITE_NAV_LINKS };
