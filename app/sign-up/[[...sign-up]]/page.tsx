import type { Metadata } from "next";
import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Create an account" };

/**
 * Creating a Clerk account grants nothing on its own — a new sign-up lands on the
 * "no access yet" screen until an admin gives them a role in Staff.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/logo-3.webp"
          alt="Pentagon International Hotel and Suites"
          width={429}
          height={429}
          priority
          className="mb-4 size-28 rounded-xl object-contain"
        />
        <p className="eyebrow">Pentagon International Hotel and Suites</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.02em]">
          Create your staff account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An administrator grants dashboard access once your account exists.
        </p>
      </div>
      <SignUp />
    </main>
  );
}
