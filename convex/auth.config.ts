/**
 * Convex trusts JWTs minted by Clerk under the "convex" template.
 *
 * `CLERK_JWT_ISSUER_DOMAIN` is set on the Convex deployment (not in .env.local):
 *   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-subdomain>.clerk.accounts.dev
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
