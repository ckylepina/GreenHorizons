// app/api/zoho/authorize/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Retrieve your client ID from your environment variables
  const clientId = process.env.ZOHO_CLIENT_ID;
  // Set the redirect URI (ensure this URI is registered in Zoho)
  const redirectUri = "http://localhost:3000/api/zoho/callback"; 
  // Define OAuth parameters
  // Using a full access scope if Zoho provides it
  const scope = "ZohoInventory.fullaccess.all";
  const state = "testing"; // Optional: useful for verifying the response
  const responseType = "code";
  const accessType = "offline"; // to request a refresh token
  const prompt = "consent";     // forces the consent screen each time

  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${encodeURIComponent(scope)}&client_id=${encodeURIComponent(clientId || '')}&state=${encodeURIComponent(state)}&response_type=${encodeURIComponent(responseType)}&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=${encodeURIComponent(accessType)}&prompt=${encodeURIComponent(prompt)}`;
  
  // Redirect the user agent to Zoho's consent page
  return NextResponse.redirect(authUrl);
}