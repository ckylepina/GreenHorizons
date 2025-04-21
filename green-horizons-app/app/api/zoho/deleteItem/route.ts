// app/api/zoho/deleteItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

// Helper to narrow unknown to an object
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error('[Server] Invalid JSON in request body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body)) {
    console.error('[Server] Request body is not an object', body);
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 });
  }
  const skuRaw = body['sku'];
  if (typeof skuRaw !== 'string' || skuRaw.trim() === '') {
    console.error('[Server] Missing or invalid sku:', skuRaw);
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }
  const sku = skuRaw.trim();

  // 2) Ensure organization ID is set
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    console.error('[Server] ZOHO_ORGANIZATION_ID not configured');
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }

  // 3) Refresh Zoho OAuth token
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err: unknown) {
    console.error('[Server] Error refreshing Zoho token:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Call Zoho DELETE endpoint
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`;
  console.log('[Server] DELETE Zoho item URL:', url);

  let resp: Response;
  let zohoBody: unknown;
  try {
    resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    });
    const text = await resp.text();
    try {
      zohoBody = JSON.parse(text);
    } catch {
      zohoBody = text;
    }
  } catch (err: unknown) {
    console.error('[Server] Network error calling Zoho DELETE:', err);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  console.log('[Server] Zoho DELETE response status:', resp.status, zohoBody);

  // 5) Handle not-found as a no-op
  if (resp.status === 404) {
    console.warn(`[Server] Zoho item "${sku}" not found; skipping deletion.`);
    return NextResponse.json({ status: 'not_found' });
  }

  // 6) Handle other errors
  if (!resp.ok) {
    console.error('[Server] Zoho DELETE returned error:', resp.status, zohoBody);
    return NextResponse.json({ error: zohoBody }, { status: resp.status });
  }

  // 7) Success
  console.log('[Server] Zoho item deleted successfully for SKU:', sku);
  return NextResponse.json({ status: 'deleted', detail: zohoBody });
}