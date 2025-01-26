'use server'

import { Resend } from 'resend';

// Initialize the Resend client
export const resend = new Resend(process.env.RESEND_API_KEY!);