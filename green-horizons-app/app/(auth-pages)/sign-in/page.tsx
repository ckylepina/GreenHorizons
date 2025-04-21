import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;

  return (
    <form className="flex-1 flex flex-col min-w-64">
      <h1 className="text-2xl font-medium">Sign in</h1>
      <p className="text-sm text-foreground">
        Don&apos;t have an account?{" "}
        <Link className="text-foreground font-medium underline" href="/sign-up">
          Sign up
        </Link>
      </p>

      <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
        {/* Email / Username */}
        <Label className="px-1" htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          autoComplete="username"    // ← tells the browser this is the login identifier
        />

        {/* Password */}
        <div className="flex justify-between items-center">
          <Label className="px-1" htmlFor="password">Password</Label>
        </div>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Your password"
          required
          autoComplete="current-password"  // ← tells the browser this is the current password
        />

        <SubmitButton pendingText="Signing In..." formAction={signInAction}>
          Sign in
        </SubmitButton>

        <div className="flex gap-4">
          <Link
            className="text-xs text-foreground underline"
            href="/forgot-password"
          >
            Forgot Password?
          </Link>
          <Link
            className="text-xs text-foreground underline"
            href="/resend-confirmation"
          >
            Resend Confirmation Link?
          </Link>
        </div>

        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}