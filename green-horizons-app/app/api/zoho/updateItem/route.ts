// app/api/zoho/updateItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

export async function POST(request: NextRequest) {
  // — 1) parse + validate incoming JSON —
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  const sku        = typeof body.sku        === 'string' ? body.sku        : '';
  const name       = typeof body.name       === 'string' ? body.name       : undefined;
  const cf_harvest = typeof body.cf_harvest === 'string' ? body.cf_harvest : undefined;
  const cf_size    = typeof body.cf_size    === 'string' ? body.cf_size    : undefined;
  const Weight     = typeof body.Weight     === 'number' ? body.Weight     : undefined;

  if (!sku) {
    return NextResponse.json({ error: 'Missing sku' }, { status: 400 });
  }

  // — 2) get orgId & OAuth token —
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not set' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth failure:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // — 3) look up the Zoho item_id for this SKU —
  const lookupUrl = `https://www.zohoapis.com/inventory/v1/items?organization_id=${orgId}&sku=${encodeURIComponent(
    sku
  )}`;
  let lookupRes: Response;
  let lookupJson: any;
  try {
    lookupRes = await fetch(lookupUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    lookupJson = await lookupRes.json();
  } catch (e) {
    console.error('Network error looking up SKU:', e);
    return NextResponse.json({ error: 'Lookup network error' }, { status: 502 });
  }
  if (!lookupRes.ok || !Array.isArray(lookupJson.items) || lookupJson.items.length === 0) {
    console.error('No Zoho item found for SKU', sku, lookupJson);
    return NextResponse.json({ error: 'Item not found in Zoho' }, { status: 404 });
  }
  const itemId = lookupJson.items[0].item_id;
  if (!itemId) {
    console.error('Zoho lookup returned no item_id for', sku, lookupJson);
    return NextResponse.json({ error: 'Invalid Zoho lookup response' }, { status: 500 });
  }

  // — 4) build the minimal payload —
  const payload: Record<string, unknown> = {};
  if (name)       payload.name = name;
  if (Weight != null) payload.Weight = Weight;
  const customFields: { customfield_id: string; value: string }[] = [];
  if (cf_harvest) customFields.push({ customfield_id: HARVEST_FIELD_ID, value: cf_harvest });
  if (cf_size)    customFields.push({ customfield_id: SIZE_FIELD_ID,    value: cf_size    });
  if (customFields.length) payload.custom_fields = customFields;

  console.log('🛠️ [Server] updateItem payload →', JSON.stringify(payload, null, 2));

  // — 5) PUT to Zoho’s update endpoint —
  const updateUrl = `https://www.zohoapis.com/inventory/v1/items/${itemId}?organization_id=${orgId}`;
  let updateRes: Response;
  try {
    updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error('Network error updating Zoho:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // — 6) parse Zoho’s response —
  let zohoBody: unknown;
  try {
    zohoBody = await updateRes.json();
  } catch {
    zohoBody = await updateRes.text();
  }

  if (!updateRes.ok) {
    console.error('Zoho updateItem error:', updateRes.status, zohoBody);
    return NextResponse.json(zohoBody, { status: updateRes.status });
  }

  console.log('✅ Zoho updateItem success:', zohoBody);
  return NextResponse.json(zohoBody);
}