// app/api/zoho/createItemGroup/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface CustomField {
  customfield_id: string;
  value:           string;
}

interface IncomingItem {
  sku:             string;
  name:            string;
  rate:            number;
  purchase_rate:   number;
  unit:            string;
  track_inventory: boolean;
  custom_fields:   CustomField[];
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(json) || !Array.isArray(json.items)) {
    return NextResponse.json(
      { error: 'Expected { items: [...] }' },
      { status: 400 }
    );
  }

  // Narrow to our item shape
  const items = (json.items as unknown[]).filter(isRecord).map((it) => ({
    sku:             String(it.sku),
    name:            String(it.name),
    rate:            Number(it.rate),
    purchase_rate:   Number(it.purchase_rate),
    unit:            String(it.unit),
    track_inventory: Boolean(it.track_inventory),
    custom_fields:   Array.isArray(it.custom_fields)
                       ? it.custom_fields.filter(isRecord).map(cf => ({
                           customfield_id: String(cf.customfield_id),
                           value:           String(cf.value),
                         }))
                       : [],
  })) as IncomingItem[];

  // 2) OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization ID not configured' },
      { status: 500 }
    );
  }

  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('Auth error:', e);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }

  // 3) Build Group payload
  const payload = {
    group_name: 'Bags',
    unit:       'qty' as const,
    items,
  };

  console.log('🧪 [Server] createItemGroup payload:', JSON.stringify(payload, null, 2));

  // 4) Call Zoho
  const url = `https://www.zohoapis.com/inventory/v1/itemgroups?organization_id=${orgId}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method:  'POST',
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

  // 5) Parse Zoho’s response or raw text
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    const txt = await resp.text();
    console.error('Failed to parse Zoho JSON:', txt);
    zohoBody = { raw: txt };
  }

  // 6) Forward error or success
  if (!resp.ok) {
    console.error('🛑 Zoho error status:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  console.log('✅ Zoho success:', zohoBody);
  return NextResponse.json(zohoBody);
}