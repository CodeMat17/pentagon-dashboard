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
    <main className='flex min-h-svh flex-col items-center justify-center gap-3 p-6'>
        <p className='eyebrow text-center'>Create your staff account</p>
     
      <SignUp />
    </main>
  );
}
