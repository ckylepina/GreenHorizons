// app/api/zoho/deleteItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

export async function POST(request: NextRequest) {
  // 1) Parse & validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  if (typeof record.sku !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }
  const sku = record.sku;

  // 2) Ensure org ID is configured
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }

  // 3) Refresh Zoho access token
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Auth error:', msg);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Call Zoho DELETE endpoint
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`;
  let resp: Response;
  let result: unknown;
  try {
    resp = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    result = await resp.json();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Network error calling Zoho:', msg);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 5) Handle Zoho response, treating 404 as a no-op
  if (resp.status === 404) {
    console.warn(`Zoho item ${sku} not found; skipping.`);
    return NextResponse.json({ status: 'not_found' });
  }
  if (!resp.ok) {
    console.error('Zoho delete error:', result);
    return NextResponse.json({ error: result }, { status: resp.status });
  }

  // 6) Success
  return NextResponse.json({ status: 'deleted' });
}