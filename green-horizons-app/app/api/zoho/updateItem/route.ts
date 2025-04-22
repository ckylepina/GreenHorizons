// app/api/zoho/updateItem/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

export async function POST(request: NextRequest) {
  // 1) Parse & validate JSON
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  // 2) Required: sku
  const sku = typeof body.sku === 'string' ? body.sku : null;
  if (!sku) {
    return NextResponse.json({ error: 'Missing or invalid "sku"' }, { status: 400 });
  }

  // 3) Optional fields
  const name       = typeof body.name       === 'string' ? body.name       : undefined;
  const cf_harvest = typeof body.cf_harvest === 'string' ? body.cf_harvest : undefined;
  const cf_size    = typeof body.cf_size    === 'string' ? body.cf_size    : undefined;
  const Weight     = typeof body.Weight     === 'number' ? body.Weight    : undefined;

  // 4) Build Zoho payload
  const payload: Record<string, unknown> = {};
  if (name)       payload.name        = name;
  const customFields: { customfield_id: string; value: string | number }[] = [];
  if (cf_harvest) customFields.push({ customfield_id: '6118005000000123236', value: cf_harvest });
  if (cf_size)    customFields.push({ customfield_id: '6118005000000280001', value: cf_size });
  if (customFields.length) payload.custom_fields = customFields;
  if (Weight !== undefined) {
    payload.package_details = { weight: Weight };
  }

  // 5) Org ID + OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err: unknown) {
    console.error('Auth error refreshing Zoho token:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // 6) Send PUT to Zoho
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`;
  console.log('🛠️ [Server] updateItem payload →', JSON.stringify(payload, null, 2));

  let resp: Response;
  let zohoBody: unknown;
  try {
    resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    zohoBody = await resp.json();
  } catch (err: unknown) {
    console.error('Network error calling Zoho updateItem:', err);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  if (!resp.ok) {
    console.error('Zoho updateItem returned error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  // 7) Success
  return NextResponse.json(zohoBody);
}