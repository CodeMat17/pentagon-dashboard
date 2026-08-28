import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; Clerk's `clerkMiddleware()`
 * is unchanged and still returns the request handler this file default-exports.
 *
 * This is the coarse gate — signed out means signed out, for every route except
 * the auth pages themselves. What a signed-in user may actually *do* is decided
 * by Convex, against the `users` table (see `convex/auth.ts`).
 */
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless in a query string.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
