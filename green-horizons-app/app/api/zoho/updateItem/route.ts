// app/api/zoho/updateItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface UpdateItemBody {
  sku: string;
  name?: string;
  cf_harvest?: string;
  cf_size?: string;
  Weight?: number;      // incoming “weight” in lbs
}

export async function POST(request: NextRequest) {
  // 1) Parse & validate incoming JSON
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof rawBody !== 'object' || rawBody === null) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }
  const body = rawBody as Record<string, unknown>;

  // 2) Extract & validate sku
  const sku = body.sku;
  if (typeof sku !== 'string' || sku.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }

  // 3) Pull out any updatable fields
  const updateFields: UpdateItemBody = { sku };
  if (typeof body.name === 'string')       updateFields.name       = body.name;
  if (typeof body.cf_harvest === 'string') updateFields.cf_harvest = body.cf_harvest;
  if (typeof body.cf_size === 'string')    updateFields.cf_size    = body.cf_size;
  if (typeof body.Weight === 'number')     updateFields.Weight     = body.Weight;

  // must have at least one real field to update
  if (Object.keys(updateFields).length <= 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // 4) Org ID & OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 5) Lookup Zoho’s internal item_id by SKU
  const lookupUrl = `https://www.zohoapis.com/inventory/v1/items?organization_id=${orgId}&sku=${encodeURIComponent(
    sku
  )}`;
  let lookupResp: Response, lookupJson: unknown;
  try {
    lookupResp = await fetch(lookupUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    lookupJson = await lookupResp.json();
  } catch (e) {
    console.error('Network error on lookup:', e);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }
  if (!lookupResp.ok) {
    console.error('Zoho lookup error:', lookupJson);
    return NextResponse.json(lookupJson as object, { status: lookupResp.status });
  }
  const lookupObj = lookupJson as { items?: unknown[] };
  if (!Array.isArray(lookupObj.items) || lookupObj.items.length === 0) {
    return NextResponse.json({ error: 'Item not found in Zoho' }, { status: 404 });
  }
  const firstItem = lookupObj.items[0] as Record<string, unknown>;
  const itemId = firstItem.item_id;
  if (typeof itemId !== 'string') {
    console.error('Unexpected lookup response:', firstItem);
    return NextResponse.json({ error: 'Unexpected Zoho response' }, { status: 500 });
  }

  // 6) Build the update payload
  const payload: Record<string, unknown> = {};
  if (updateFields.name)       payload.name = updateFields.name;
  // any custom fields we need?
  const custom: { customfield_id: string; value: string }[] = [];
  if (updateFields.cf_harvest) custom.push({ customfield_id: '6118005000000123236', value: updateFields.cf_harvest });
  if (updateFields.cf_size)    custom.push({ customfield_id: '6118005000000280001', value: updateFields.cf_size });
  if (custom.length)           payload.custom_fields = custom;

  // **new**: if they passed Weight, stick it under package_details
  if (typeof updateFields.Weight === 'number') {
    payload.package_details = {
      weight: updateFields.Weight,
      weight_unit: 'lb',
    };
  }

  // 7) Send PUT to Zoho
  const updateUrl = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    itemId
  )}?organization_id=${orgId}`;
  let updateResp: Response, updateJson: unknown;
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
  } catch (e) {
    console.error('Network error during update:', e);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  if (!updateResp.ok) {
    console.error('Zoho update error:', updateJson);
    return NextResponse.json(updateJson as object, { status: updateResp.status });
  }

  // 8) Success
  return NextResponse.json(updateJson as object);
}