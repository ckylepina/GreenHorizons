import { EmailTemplate } from "@/app/components/EmailTemplate";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { contact } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'Aero Mystic <contact@aeromystic.com>',
      to: [contact],
      subject: 'Welcome to Our Newsletter',
      react: EmailTemplate({ contact }),
    });

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), { status: 500 });
  }
}