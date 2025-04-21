// app/api/zoho/updateItem/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) parse + validate
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (
    !isRecord(body) ||
    typeof body.sku         !== 'string' ||
    typeof body.name        !== 'string' ||
    typeof body.cf_harvest  !== 'string' ||
    typeof body.cf_size     !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { sku, name, cf_harvest, cf_size, rate = 0, purchase_rate = 0 } = body;

  // 2) orgId + OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) return NextResponse.json({ error: 'Org ID not set' }, { status: 500 });

  let token: string;
  try { token = await refreshZohoAccessToken(); }
  catch (e) {
    console.error('Auth failed:', e);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 3) lookup item_id by SKU
  const lookupUrl = new URL('https://www.zohoapis.com/inventory/v1/items');
  lookupUrl.searchParams.set('organization_id', orgId);
  lookupUrl.searchParams.set('sku', sku);

  const lookupResp = await fetch(lookupUrl.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const lookupJson = await lookupResp.json();
  if (!lookupResp.ok || !isRecord(lookupJson) || !Array.isArray(lookupJson.items) || lookupJson.items.length === 0) {
    return NextResponse.json({ error: 'Item not found in Zoho' }, { status: 404 });
  }
  const itemId = String((lookupJson.items[0] as any).item_id);

  // 4) PUT to update that item
  const payload = {
    name,
    rate,
    purchase_rate,
    custom_fields: [
      { customfield_id: '6118005000000123236', value: cf_harvest },
      { customfield_id: '6118005000000280001', value: cf_size    },
    ],
  };

  const updateUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(itemId)}?organization_id=${orgId}`;
  const updateResp = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const updateJson = await updateResp.json();
  if (!updateResp.ok) {
    console.error('Zoho update error:', updateResp.status, updateJson);
    return NextResponse.json(updateJson, { status: updateResp.status });
  }

  return NextResponse.json({ status: 'ok', detail: updateJson });
}