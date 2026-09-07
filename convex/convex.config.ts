import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

/**
 * The rate limiter keeps its own tables, so throttling costs this app no schema
 * and no bookkeeping in the mutations themselves. See `convex/limits.ts` for the
 * limits and why each one is set where it is.
 */
const app = defineApp();
app.use(rateLimiter);

export default app;
