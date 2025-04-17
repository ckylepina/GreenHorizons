// app/api/zoho/callback/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Extract the search params from the URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri = "http://localhost:3000/api/zoho/callback"; // Must match the one you registered

  // Prepare parameters for token exchange
  const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";
  const params = new URLSearchParams({
    code,
    client_id: clientId || '',
    client_secret: clientSecret || '',
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  // Exchange the authorization code for access and refresh tokens
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: tokenData }, { status: 500 });
  }

  // Log tokens to the server console (DO NOT expose in production)
  console.log("Access Token:", tokenData.access_token);
  console.log("Refresh Token:", tokenData.refresh_token);

  // Optionally, you can redirect the user to a success page
  return NextResponse.json({ message: "Tokens obtained successfully. Check your server logs for details.", tokenData });
}