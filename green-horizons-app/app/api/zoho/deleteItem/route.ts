// app/api/zoho/deleteItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

// Narrow unknown to object
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.sku !== 'string' || !body.sku.trim()) {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }
  const sku = body.sku.trim();

  // 2) Org ID check
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }

  // 3) Get fresh access token
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err: unknown) {
    console.error('✖️ Auth error refreshing Zoho token:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Lookup the Zoho internal item_id by SKU
  const lookupUrl = new URL(
    `https://www.zohoapis.com/inventory/v1/items`,
  );
  lookupUrl.searchParams.set('organization_id', orgId);
  lookupUrl.searchParams.set('sku', sku);

  let lookupResp: Response;
  let lookupBody: unknown;
  try {
    lookupResp = await fetch(lookupUrl.toString(), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    lookupBody = await lookupResp.json();
  } catch (err: unknown) {
    console.error('✖️ Network error looking up SKU:', err);
    return NextResponse.json({ error: 'Lookup network error' }, { status: 502 });
  }

  if (!lookupResp.ok || !isRecord(lookupBody) || !Array.isArray((lookupBody as any).items)) {
    console.error('✖️ Error or unexpected lookup response:', lookupResp.status, lookupBody);
    return NextResponse.json({ error: lookupBody }, { status: lookupResp.status });
  }

  const items = (lookupBody as { items: unknown[] }).items;
  if (items.length === 0) {
    return NextResponse.json({ status: 'not_found' });
  }

  // 5) Extract the Zoho item_id
  const first = items[0];
  if (!isRecord(first) || typeof first.item_id !== 'string') {
    console.error('✖️ Malformed item in lookup response', first);
    return NextResponse.json({ error: 'Malformed lookup data' }, { status: 500 });
  }
  const itemId = first.item_id;

  // 6) Now delete by that item_id
  const deleteUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    itemId
  )}?organization_id=${orgId}`;
  let delResp: Response;
  let delBody: unknown;
  try {
    delResp = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const text = await delResp.text();
    try { delBody = JSON.parse(text); }
    catch { delBody = text; }
  } catch (err: unknown) {
    console.error('✖️ Network error deleting in Zoho:', err);
    return NextResponse.json({ error: 'Delete network error' }, { status: 502 });
  }

  console.log('🗑️ Zoho DELETE status:', delResp.status, delBody);

  if (delResp.status === 404) {
    return NextResponse.json({ status: 'not_found' });
  }
  if (!delResp.ok) {
    return NextResponse.json({ error: delBody }, { status: delResp.status });
  }

  return NextResponse.json({ status: 'deleted', detail: delBody });
}