// app/api/zoho/updateItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

/** Tiny guard to check for a plain object */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse incoming JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 });
  }

  // 2) Validate required fields
  const sku        = typeof body['sku']         === 'string' ? body['sku']         : null;
  const name       = typeof body['name']        === 'string' ? body['name']        : null;
  const cf_harvest = typeof body['cf_harvest']  === 'string' ? body['cf_harvest']  : null;
  const cf_size    = typeof body['cf_size']     === 'string' ? body['cf_size']     : null;
  const rate       = typeof body['rate']        === 'number' ? body['rate']        : 0;
  const purchase_rate = typeof body['purchase_rate'] === 'number' ? body['purchase_rate'] : 0;

  if (!sku || !name || !cf_harvest || !cf_size) {
    return NextResponse.json(
      { error: 'Missing one of: sku, name, cf_harvest, cf_size' },
      { status: 400 }
    );
  }

  // 3) Load org ID & OAuth token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    console.error('Zoho org ID not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('Auth error:', e);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Lookup existing item by SKU
  const lookupUrl = new URL('https://www.zohoapis.com/inventory/v1/items');
  lookupUrl.searchParams.set('organization_id', orgId);
  lookupUrl.searchParams.set('sku', sku);

  const lookupResp = await fetch(lookupUrl.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  let lookupJson: unknown;
  try {
    lookupJson = await lookupResp.json();
  } catch (e) {
    console.error('Lookup parse error:', e);
    return NextResponse.json({ error: 'Lookup parse error' }, { status: 502 });
  }

  if (
    !lookupResp.ok ||
    !isRecord(lookupJson) ||
    !Array.isArray(lookupJson.items) ||
    lookupJson.items.length === 0
  ) {
    console.error('Item not found in Zoho:', lookupResp.status, lookupJson);
    return NextResponse.json({ error: 'Item not found in Zoho' }, { status: 404 });
  }

  const first = lookupJson.items[0];
  if (!isRecord(first) || typeof first.item_id !== 'string') {
    console.error('Malformed lookup response item:', first);
    return NextResponse.json({ error: 'Malformed Zoho lookup' }, { status: 500 });
  }
  const itemId = first.item_id;

  // 5) Build update payload
  const payload = {
    name,
    rate,
    purchase_rate,
    custom_fields: [
      { customfield_id: '6118005000000123236', value: cf_harvest },
      { customfield_id: '6118005000000280001', value: cf_size    },
    ],
  };
  console.log('🧪 [Server] updateItem payload →', JSON.stringify(payload, null, 2));

  // 6) Send the PUT
  const updateUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    itemId
  )}?organization_id=${orgId}`;
  let updateResp: Response;
  try {
    updateResp = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error('Network error on updateItem:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  let updateJson: unknown;
  try {
    updateJson = await updateResp.json();
  } catch (e) {
    console.error('Update parse error:', e);
    const text = await updateResp.text();
    console.error('Raw update text:', text);
    return NextResponse.json({ error: 'Update parse error', raw: text }, { status: 502 });
  }

  if (!updateResp.ok) {
    console.error('Zoho update error:', updateResp.status, updateJson);
    return NextResponse.json(updateJson, { status: updateResp.status });
  }

  return NextResponse.json({ status: 'ok', result: updateJson });
}