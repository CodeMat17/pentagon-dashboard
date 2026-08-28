"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { LoaderCircleIcon, MenuIcon, PentagonIcon, ShieldAlertIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

/* ------------------------------------------------------------------- role */

interface Viewer {
  id: Id<"users">;
  name: string;
  email: string;
  role: Role;
}

const ViewerContext = createContext<Viewer | null>(null);

/**
 * The signed-in staff member. Available anywhere under the shell, and never null
 * there — the shell does not render its children until Convex has confirmed one.
 */
export function useViewer(): Viewer {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error("useViewer must be used inside the dashboard shell.");
  return viewer;
}

/* ------------------------------------------------------------------ shell */

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthLoading>
        <Splash>Checking your session…</Splash>
      </AuthLoading>

      <Unauthenticated>
        <Splash>
          <span className="flex flex-col items-center gap-4">
            Your session has ended.
            <Button render={<Link href="/sign-in" />}>Sign in again</Button>
          </span>
        </Splash>
      </Unauthenticated>

      <Authenticated>
        <AuthorizedShell>{children}</AuthorizedShell>
      </Authenticated>
    </>
  );
}

function AuthorizedShell({ children }: { children: ReactNode }) {
  const viewer = useQuery(api.users.me, {});
  const sync = useMutation(api.users.sync);
  const synced = useRef(false);

  // Once per session: record the sign-in, claim an invitation, or bootstrap the
  // very first owner. `me` is reactive, so the screen updates as soon as it lands.
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    void sync({});
  }, [sync]);

  if (viewer === undefined) return <Splash>Loading the dashboard…</Splash>;
  if (viewer === null) return <NoAccess />;

  return (
    <ViewerContext.Provider
      value={{
        id: viewer._id,
        name: viewer.name,
        email: viewer.email,
        role: viewer.role,
      }}
    >
      <div className="flex min-h-svh w-full">
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
          <Brand />
          <SidebarNav role={viewer.role} />
          <p className="mt-auto px-3 text-xs text-muted-foreground">
            Signed in as {viewer.name}
            <br />
            <span className="font-semibold">{ROLE_LABELS[viewer.role]}</span>
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
            <MobileNav role={viewer.role} />
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserButton
                appearance={{ elements: { avatarBox: "size-8" } }}
                userProfileMode="modal"
              />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </ViewerContext.Provider>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 px-3 py-1">
      <PentagonIcon className="size-5 text-brand" aria-hidden />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-extrabold tracking-[-0.01em]">Pentagon</span>
        {!compact && (
          <span className="text-[0.7rem] font-semibold text-muted-foreground">
            Hotel dashboard
          </span>
        )}
      </span>
    </Link>
  );
}

function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden" />
        }
      >
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-4">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle className="text-left">
            <Brand />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Dashboard sections
          </SheetDescription>
        </SheetHeader>
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-6 animate-spin text-brand" aria-hidden />
      {children}
    </div>
  );
}

/**
 * Signed in with Clerk, but no active row in Convex `users` — the deliberate
 * default for anyone who creates an account without being invited.
 */
function NoAccess() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlertIcon className="size-8 text-brand" aria-hidden />
      <h1 className="text-xl font-extrabold">No dashboard access yet</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your account exists, but an administrator has not granted it a role. Ask
        whoever manages the dashboard to add you under Staff, then reload.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => location.reload()}>
          Reload
        </Button>
        <SignOutButton>
          <Button variant="ghost">Sign out</Button>
        </SignOutButton>
      </div>
    </div>
  );
}
