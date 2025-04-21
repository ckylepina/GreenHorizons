// app/api/zoho/updateItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

/** Guard for plain objects */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // ——————————————————————————————
  // 1) Read & log raw body for debugging
  // ——————————————————————————————
  const rawBody = await request.text();
  console.log('▶️ updateItem invoked with raw body:', rawBody);

  // 2) Parse JSON from that raw text
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    console.error('❌ updateItem JSON.parse error:', e);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(body)) {
    console.warn('⚠️ updateItem expected object, got:', body);
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 });
  }

  // ——————————————————————————————
  // 3) Extract & validate required fields
  // ——————————————————————————————
  const sku        = typeof body.sku         === 'string' ? body.sku         : null;
  const name       = typeof body.name        === 'string' ? body.name        : null;
  const cf_harvest = typeof body.cf_harvest  === 'string' ? body.cf_harvest  : null;
  const cf_size    = typeof body.cf_size     === 'string' ? body.cf_size     : null;
  const rate       = typeof body.rate        === 'number' ? body.rate        : 0;
  const purchase_rate =
    typeof body.purchase_rate === 'number' ? body.purchase_rate : 0;

  if (!sku || !name || !cf_harvest || !cf_size) {
    console.error('❌ updateItem missing fields:', { sku, name, cf_harvest, cf_size });
    return NextResponse.json(
      { error: 'Missing one of: sku, name, cf_harvest, cf_size' },
      { status: 400 }
    );
  }

  // ——————————————————————————————
  // 4) Get Org ID & OAuth token
  // ——————————————————————————————
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    console.error('❌ updateItem ZOHO_ORGANIZATION_ID missing');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('❌ updateItem auth error:', e);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // ——————————————————————————————
  // 5) Lookup existing item by SKU
  // ——————————————————————————————
  const lookupUrl = new URL('https://www.zohoapis.com/inventory/v1/items');
  lookupUrl.searchParams.set('organization_id', orgId);
  lookupUrl.searchParams.set('sku', sku);

  let lookupResp: Response, lookupJson: unknown;
  try {
    lookupResp = await fetch(lookupUrl.toString(), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    lookupJson = await lookupResp.json();
  } catch (e) {
    console.error('❌ updateItem lookup network/parse error:', e);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });
  }

  if (
    !lookupResp.ok ||
    !isRecord(lookupJson) ||
    !Array.isArray(lookupJson.items) ||
    lookupJson.items.length === 0
  ) {
    console.error('❌ updateItem item not found:', lookupResp.status, lookupJson);
    return NextResponse.json({ error: 'Item not found in Zoho' }, { status: 404 });
  }

  const first = lookupJson.items[0];
  if (!isRecord(first) || typeof first.item_id !== 'string') {
    console.error('❌ updateItem malformed lookup response item:', first);
    return NextResponse.json({ error: 'Malformed Zoho lookup' }, { status: 500 });
  }
  const itemId = first.item_id;

  // ——————————————————————————————
  // 6) Build update payload & log it
  // ——————————————————————————————
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

  // ——————————————————————————————
  // 7) Send PUT to Zoho
  // ——————————————————————————————
  const updateUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    itemId
  )}?organization_id=${orgId}`;

  let updateResp: Response, updateJson: unknown;
  try {
    updateResp = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    });
    // attempt to parse JSON (or fallback to raw text)
    try {
      updateJson = await updateResp.json();
    } catch {
      updateJson = await updateResp.text();
    }
  } catch (e) {
    console.error('❌ updateItem network error:', e);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  if (!updateResp.ok) {
    console.error('❌ Zoho updateItem error:', updateResp.status, updateJson);
    return NextResponse.json(updateJson, { status: updateResp.status });
  }

  console.log('✅ updateItem succeeded:', updateJson);
  return NextResponse.json({ status: 'ok', result: updateJson });
}