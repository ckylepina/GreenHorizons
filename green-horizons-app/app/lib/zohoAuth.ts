// lib/zohoAuth.ts
export async function refreshZohoAccessToken(): Promise<string> {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing Zoho OAuth environment variables.");
    }
  
    const url = "https://accounts.zoho.com/oauth/v2/token";
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });
  
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error("Failed to refresh access token: " + JSON.stringify(errorData));
    }
  
    const data = await response.json();
    return data.access_token;  // Use this token for your API requests
  }  