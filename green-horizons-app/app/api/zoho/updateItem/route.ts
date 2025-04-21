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
  // 1) parse + validate
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

  // 3) build minimal payload
  const payload: Record<string, unknown> = {};
  if (update.name     !== undefined) payload.name           = update.name;
  if (update.rate     !== undefined) payload.rate           = update.rate;
  if (update.purchase_rate !== undefined) payload.purchase_rate = update.purchase_rate;

  // custom_fields is an array
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

  // 4) send to Zoho
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    update.sku
  )}?organization_id=${orgId}`;

  console.log('🧪 [Server] updateItem payload →', JSON.stringify(payload, null, 2));

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
  } catch (networkErr) {
    console.error('Network error calling Zoho:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  try {
    zohoBody = await resp.json();
  } catch (parseErr) {
    console.error('Failed to parse Zoho response:', parseErr);
    zohoBody = await resp.text();
  }

  if (!resp.ok) {
    console.error('Zoho updateItem error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  console.log('✅ Zoho updateItem success:', zohoBody);
  return NextResponse.json(zohoBody);
}