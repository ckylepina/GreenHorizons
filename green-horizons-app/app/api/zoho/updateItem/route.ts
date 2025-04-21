// app/api/zoho/updateItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

export async function POST(request: NextRequest) {
  // 1) Parse + validate JSON body
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

  // 2) Load org ID & OAuth token
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

  // 3) Build Zoho payload only including provided fields
  const payload: Record<string, unknown> = {};
  if (name)       payload.name          = name;
  if (Weight != null) payload.Weight   = Weight;
  const customFields: { customfield_id: string; value: string }[] = [];
  if (cf_harvest) customFields.push({ customfield_id: HARVEST_FIELD_ID, value: cf_harvest });
  if (cf_size)    customFields.push({ customfield_id: SIZE_FIELD_ID,    value: cf_size    });
  if (customFields.length) payload.custom_fields = customFields;

  console.log('🛠️ [Server] updateItem payload:', JSON.stringify(payload, null, 2));

  // 4) PUT to Zoho
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error('Network error calling Zoho:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 5) Parse Zoho response (or raw text on parse error)
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    zohoBody = await resp.text();
  }

  // 6) Handle non‑OK status
  if (!resp.ok) {
    console.error('Zoho updateItem error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  // 7) Success
  console.log('✅ Zoho updateItem success:', zohoBody);
  return NextResponse.json(zohoBody);
}