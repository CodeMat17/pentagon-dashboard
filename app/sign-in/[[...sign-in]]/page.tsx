import type { Metadata } from "next";
import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-3 p-6'>
    
        <p className='eyebrow text-center'>Staff dashboard</p>
    
      <SignIn />
    </main>
  );
}
