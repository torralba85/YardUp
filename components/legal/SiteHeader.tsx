"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { SITE_NAV_LINKS } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

// The same links and labels as PublicHeader and the landing (lib/site-nav). The
// logo links home; the page's own action reaches the Studio.

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
 * Shared site header for every page outside the marketing landing: the brand
 * lockup links home, the main menu sits inline from 800px and behind a menu
 * button below it (design-system §7 Nav: `aria-expanded`/`aria-controls`,
 * Escape closes and returns focus to the trigger).
 *
 * @param props.actions - Trailing page action (Open studio, account menu…).
 * @param props.width - Container width class; matches the page's own header.
 */
export function SiteHeader({
  actions,
  width = "max-w-4xl",
}: {
  actions?: ReactNode;
  width?: string;
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

  return (
    <header
      className="border-b border-lot-line bg-lot-chalk"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className={cn("mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6", width)}>
        <Link
          href="/"
          aria-label="LotFoundry home"
          className="flex min-h-11 shrink-0 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          <BrandLockup className="h-7 w-auto" />
        </Link>

        <nav aria-label="Main navigation" className="hidden min-[800px]:block">
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
          </ul>
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          {actions}
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="sm"
            className="min-w-11 px-2 min-[800px]:hidden"
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
          className="border-t border-lot-line bg-lot-chalk min-[800px]:hidden"
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
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export { SITE_NAV_LINKS };
