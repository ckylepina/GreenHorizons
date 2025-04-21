// app/api/zoho/deleteItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

// A small type‑guard for checking plain objects
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse & validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }
  const skuRaw = body['sku'];
  if (typeof skuRaw !== 'string' || skuRaw.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }
  const sku = skuRaw;

  // 2) Ensure org ID is configured
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }

  // 3) Refresh Zoho access token
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Auth error refreshing Zoho token:', msg);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Call Zoho DELETE endpoint
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`;
  let resp: Response;
  let zohoResponseBody: unknown;
  try {
    resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    });
    // Zoho sometimes returns non‑JSON on error, so we try JSON first
    const text = await resp.text();
    try {
      zohoResponseBody = JSON.parse(text);
    } catch {
      zohoResponseBody = text;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Network error calling Zoho DELETE:', msg);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 5) Handle Zoho response
  if (resp.status === 404) {
    console.warn(`Zoho item "${sku}" not found; skipping deletion.`);
    return NextResponse.json({ status: 'not_found' });
  }
  if (!resp.ok) {
    console.error('Zoho DELETE returned error status:', resp.status, zohoResponseBody);
    return NextResponse.json({ error: zohoResponseBody }, { status: resp.status });
  }

  // 6) Success
  return NextResponse.json({ status: 'deleted', detail: zohoResponseBody });
}