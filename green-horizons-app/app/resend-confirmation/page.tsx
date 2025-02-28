import { resendSignupConfirmationAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage, Message } from "@/components/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ResendConfirmationPage(props: { searchParams: Promise<Message> }) {
    const searchParams = await props.searchParams;

    return (
        <form
        className="max-w-sm mx-auto mt-16 flex flex-col gap-3"
        >
        <h1 className="text-2xl font-medium mb-4">Resend Confirmation</h1>

        <Label htmlFor="email">Email</Label>
        <Input name="email" type="email" placeholder="you@example.com" required />

            <SubmitButton pendingText="Signing In..." formAction={resendSignupConfirmationAction}>
                    Resend
            </SubmitButton>

        {/* Display success/error messages via searchParams + your FormMessage component */}
        <FormMessage message={searchParams} />
        </form>
    );
}
