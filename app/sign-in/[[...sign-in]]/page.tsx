import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <p className="eyebrow">Pentagon Hotel and Suites</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.02em]">
          Staff dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with the account the hotel gave you access with.
        </p>
      </div>
      <SignIn />
    </main>
  );
}
