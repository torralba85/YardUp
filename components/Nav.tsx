"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const initial = (user?.displayName || user?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="nav">
      <Link href="/" className="navBrand">
        <span className="navLogo">Y</span>
        <span>YardUp</span>
      </Link>
      <nav className="navLinks">
        <Link href="/estimate">Estimate</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <div className="navAuth">
        {loading ? (
          <span className="navMuted">Loading…</span>
        ) : user ? (
          <>
            <Link href="/dashboard" className="navUser" aria-label="Account">
              <span className="navAvatar">{initial}</span>
              <span className="navUserName">
                {user.displayName || user.email}
              </span>
            </Link>
            <button type="button" className="navGhost" onClick={handleLogout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="navGhost">
              Log in
            </Link>
            <Link href="/register" className="navPrimary">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
