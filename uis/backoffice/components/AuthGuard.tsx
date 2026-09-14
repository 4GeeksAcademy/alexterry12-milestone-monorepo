"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarNav } from "@/components/SidebarNav";
import {
  TOKEN_KEY,
  logout,
  registerAuthRedirect,
} from "@/lib/authApi";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

type AuthGuardProps = {
  children: React.ReactNode;
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-ink text-surface">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            TrackFlow
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            Backoffice
          </p>
        </div>
        <SidebarNav />
        <div className="border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-surface/70 transition-colors hover:bg-panel/60 hover:text-surface"
          >
            Log out
          </button>
          <p className="mt-2 font-mono text-xs text-surface/50">Internal only</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-surface px-8 py-4">
          <p className="text-sm text-muted">Operations console</p>
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
      Loading…
    </div>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    registerAuthRedirect(() => {
      router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const hasToken = Boolean(token);

    if (!hasToken && !isPublic) {
      router.replace("/login");
      setAuthenticated(false);
      setReady(true);
      return;
    }

    setAuthenticated(hasToken);
    setReady(true);
  }, [pathname, isPublic, router]);

  if (!ready) {
    return <LoadingScreen />;
  }

  if (isPublic) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <main className="px-8 py-8">{children}</main>
      </div>
    );
  }

  if (!authenticated) {
    return <LoadingScreen />;
  }

  return <AppShell>{children}</AppShell>;
}
