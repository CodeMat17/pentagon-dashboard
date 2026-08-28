"use client";

import { ReactNode, useMemo } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";

/**
 * Clerk authenticates, Convex authorizes.
 *
 * `ConvexProviderWithClerk` keeps a Clerk JWT (the "convex" template) attached to
 * the Convex websocket, so every query and mutation arrives with an identity that
 * `convex/auth.ts` can look up in the `users` table.
 */
export function Providers({ children }: { children: ReactNode }) {
  // One client for the life of the tab. Created lazily so the module can be
  // imported during prerender without a deployment URL.
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL is not set — run `npx convex dev` to create a deployment.",
      );
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#b98a3c",
          fontFamily: "var(--font-sans)",
          borderRadius: "0.75rem",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
