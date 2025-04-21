// app/api/zoho/updateItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

interface UpdateBody {
  sku: string;
  name?: string;
  cf_harvest?: string;
  cf_size?: string;
  rate?: number;
  purchase_rate?: number;
}

export async function POST(request: NextRequest) {
  // 1) parse+validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 });
  }
  const update = body as UpdateBody;
  if (!update.sku) {
    return NextResponse.json({ error: 'Missing sku' }, { status: 400 });
  }

  // 2) org & token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Missing ZOHO_ORGANIZATION_ID' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth error refreshing Zoho token:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 3) Lookup item_id by SKU
  const lookupUrl = `https://www.zohoapis.com/inventory/v1/items?sku=${encodeURIComponent(
    update.sku
  )}&organization_id=${orgId}`;
  let lookupResp: Response;
  let lookupJson: any;
  try {
    lookupResp = await fetch(lookupUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    lookupJson = await lookupResp.json();
  } catch (err) {
    console.error('Network error during SKU lookup:', err);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
  if (!lookupResp.ok || !Array.isArray(lookupJson.items) || lookupJson.items.length === 0) {
    console.error('SKU lookup failed:', lookupResp.status, lookupJson);
    return NextResponse.json({ error: 'Item not found in Zoho' }, { status: 404 });
  }
  const itemId = lookupJson.items[0].item_id;
  console.log('🧪 [Server] Found item_id for SKU', update.sku, '→', itemId);

  // 4) Build update‐payload
  const payload: Record<string, unknown> = {};
  if (update.name     !== undefined) payload.name           = update.name;
  if (update.rate     !== undefined) payload.rate           = update.rate;
  if (update.purchase_rate !== undefined) payload.purchase_rate = update.purchase_rate;

  const cf: Array<{ customfield_id: string; value: string }> = [];
  if (update.cf_harvest !== undefined) {
    cf.push({ customfield_id: HARVEST_FIELD_ID, value: update.cf_harvest });
  }
  if (update.cf_size    !== undefined) {
    cf.push({ customfield_id: SIZE_FIELD_ID, value: update.cf_size });
  }
  if (cf.length) {
    payload.custom_fields = cf;
  }

  // 5) PUT to Zoho
  const updateUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    itemId
  )}?organization_id=${orgId}`;
  console.log('🧪 [Server] updateItem payload →', JSON.stringify(payload, null, 2));

  let updateResp: Response;
  let updateJson: unknown;
  try {
    updateResp = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    updateJson = await updateResp.json();
  } catch (err) {
    console.error('Network error calling Zoho update:', err);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  if (!updateResp.ok) {
    console.error('Zoho updateItem error:', updateResp.status, updateJson);
    return NextResponse.json(updateJson, { status: updateResp.status });
  }

  console.log('✅ Zoho updateItem success:', updateJson);
  return NextResponse.json(updateJson);
}