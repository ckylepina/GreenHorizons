import { EmailTemplate } from '@/components/EmailTemplate';
import { Resend } from 'resend';
import React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {

    const { contact } = await req.json();
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), { status: 500 });
  }
}