// app/api/zoho/updateItem/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) parse JSON
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(raw)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }

  const body = raw;

  // 2) extract & validate SKU
  const skuVal = body['sku'];
  if (typeof skuVal !== 'string' || !skuVal.trim()) {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 });
  }
  const sku = skuVal;

  // 3) pull optional fields
  const name       = typeof body['name'] === 'string' ? body['name'] : undefined;
  const cfHarvest  = typeof body['cf_harvest'] === 'string' ? body['cf_harvest'] : undefined;
  const cfSize     = typeof body['cf_size']    === 'string' ? body['cf_size']    : undefined;
  const weightNum  = typeof body['Weight']     === 'number' ? body['Weight']    : undefined;

  // 4) build Zoho payload
  const payload: Record<string, unknown> = {};
  if (name)         payload.name = name;
  if (cfHarvest) {
    payload.custom_fields = [
      { customfield_id: HARVEST_FIELD_ID, value: cfHarvest }
    ];
  }
  if (cfSize) {
    payload.custom_fields = [
      ...(Array.isArray(payload.custom_fields) ? payload.custom_fields : []),
      { customfield_id: SIZE_FIELD_ID, value: cfSize }
    ];
  }
  if (weightNum !== undefined) {
    payload.package_details = { weight: weightNum, weight_unit: 'lb' };
  }

  // 5) auth & endpoint
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth failed:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(sku)}?organization_id=${orgId}`;

  // 6) send to Zoho
  console.log('🛠️ [Server] updateItem payload →', JSON.stringify(payload, null, 2));
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (networkErr) {
    console.error('Network error:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 7) parse Zoho’s response
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch (parseErr) {
    const rawText = await resp.text();
    console.error('Failed to parse Zoho JSON:', parseErr);
    zohoBody = { raw: rawText };
  }

  // 8) handle error status
  if (!resp.ok) {
    console.error('Zoho returned error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  // 9) success
  console.log('✅ Zoho updateItem response:', zohoBody);
  return NextResponse.json(zohoBody);
}