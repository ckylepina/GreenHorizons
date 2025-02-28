// app/welcome/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <h1 className="text-2xl font-medium mb-4">Email Confirmed!</h1>
      <p className="mb-6">Your account is now ready. Please sign in below.</p>

      {/* 
        Use your Button component with `asChild` 
        so it wraps the Next.js <Link>.
      */}
      <Button variant="default" size="default" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
