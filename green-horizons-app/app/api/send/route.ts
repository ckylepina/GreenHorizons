import { EmailTemplate } from '@/components/EmailTemplate';
import { Resend } from 'resend';
import React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { contact } = await req.json();

    // Validate 'contact' to ensure it's a valid email address
    if (typeof contact !== 'string' || !validateEmail(contact)) {
      return new Response(JSON.stringify({ error: 'Invalid contact email provided.' }), { status: 400 });
    }

    const reactNode = React.createElement(EmailTemplate, { contact });

    const { data, error } = await resend.emails.send({
      from: 'Aero Mystic <contact@aeromystic.com>',
      to: [contact],
      subject: 'Welcome to Our Newsletter',
      react: reactNode,
    });

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}

/**
 * Utility function to validate email addresses.
 * You can use more robust validation as needed.
 */
function validateEmail(email: string): boolean {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}
