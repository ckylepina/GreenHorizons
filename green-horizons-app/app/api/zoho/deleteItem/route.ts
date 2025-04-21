// app/api/zoho/deleteItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

/** Type‑guard for plain objects */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate incoming JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error('[Server] Invalid JSON in request');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.sku !== 'string' || !body.sku.trim()) {
    console.error('[Server] Missing or invalid sku:', body);
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }
  const sku = body.sku.trim();

  // 2) Check organization ID
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    console.error('[Server] ZOHO_ORGANIZATION_ID not set');
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }

  // 3) Refresh OAuth token
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err: unknown) {
    console.error('[Server] Error refreshing Zoho token:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Look up Zoho’s internal item_id by SKU
  const lookupUrl = new URL('https://www.zohoapis.com/inventory/v1/items');
  lookupUrl.searchParams.set('organization_id', orgId);
  lookupUrl.searchParams.set('sku', sku);

  let lookupResp: Response;
  let lookupData: unknown;
  try {
    lookupResp = await fetch(lookupUrl.toString(), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    lookupData = await lookupResp.json();
  } catch (err: unknown) {
    console.error('[Server] Network error during SKU lookup:', err);
    return NextResponse.json({ error: 'Lookup network error' }, { status: 502 });
  }

  if (!lookupResp.ok) {
    console.error('[Server] Zoho SKU lookup failed:', lookupResp.status, lookupData);
    return NextResponse.json({ error: lookupData }, { status: lookupResp.status });
  }
  if (!isRecord(lookupData)) {
    console.error('[Server] Unexpected lookup response shape:', lookupData);
    return NextResponse.json({ error: 'Malformed lookup response' }, { status: 500 });
  }

  const itemsRaw = lookupData['items'];
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    console.warn(`[Server] No Zoho item found for SKU "${sku}"`);
    return NextResponse.json({ status: 'not_found' });
  }

  const firstItem = itemsRaw[0];
  if (!isRecord(firstItem) || typeof firstItem.item_id !== 'string') {
    console.error('[Server] Lookup item missing item_id:', firstItem);
    return NextResponse.json({ error: 'Malformed item data' }, { status: 500 });
  }
  const itemId = firstItem.item_id;

  // 5) DELETE the item by its Zoho item_id
  const deleteUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    itemId
  )}?organization_id=${orgId}`;
  console.log('[Server] Deleting Zoho item:', deleteUrl);

  let deleteResp: Response;
  let deleteData: unknown;
  try {
    deleteResp = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const text = await deleteResp.text();
    try {
      deleteData = JSON.parse(text);
    } catch {
      deleteData = text;
    }
  } catch (err: unknown) {
    console.error('[Server] Network error during DELETE:', err);
    return NextResponse.json({ error: 'Delete network error' }, { status: 502 });
  }

  console.log('[Server] Zoho DELETE response:', deleteResp.status, deleteData);
  if (deleteResp.status === 404) {
    return NextResponse.json({ status: 'not_found' });
  }
  if (!deleteResp.ok) {
    console.error('[Server] Zoho DELETE returned error:', deleteResp.status, deleteData);
    return NextResponse.json({ error: deleteData }, { status: deleteResp.status });
  }

  // 6) Success
  return NextResponse.json({ status: 'deleted', detail: deleteData });
}