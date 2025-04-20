// app/api/zoho/createItemGroup/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(rawBody) || !Array.isArray(rawBody.items)) {
    return NextResponse.json({ error: 'Expected { items: [...] }' }, { status: 400 });
  }
  const itemsRaw = rawBody.items;

  // 2) OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('Auth error:', e);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // 3) Build Zoho group payload
  const payload = {
    group_name: 'Bags',
    unit:       'qty',
    items: itemsRaw.map((it) => {
      if (!isRecord(it)) {
        throw new Error('Invalid item payload');
      }
      const sku           = String(it.sku ?? '');
      const name          = String(it.name ?? '');
      const rate          = Number(it.rate ?? 0);
      const purchase_rate = Number(it.purchase_rate ?? 0);

      // extract harvest & size from custom_fields[]
      const cfArray = Array.isArray(it.custom_fields) ? it.custom_fields : [];
      let harvestValue = '';
      let sizeValue    = '';
      for (const cf of cfArray) {
        if (!isRecord(cf)) continue;
        const id  = String(cf.customfield_id ?? '');
        const val = cf.value;
        if (id === HARVEST_FIELD_ID && typeof val === 'string') {
          harvestValue = val;
        }
        if (id === SIZE_FIELD_ID && typeof val === 'string') {
          sizeValue = val;
        }
      }
      // fallback if empty
      if (!harvestValue.trim()) {
        harvestValue = sku;
      }

      return {
        name,
        sku,
        rate,
        purchase_rate,
        unit:            'qty',
        track_inventory: true,
        custom_fields: [
          { customfield_id: HARVEST_FIELD_ID, value: harvestValue },
          { customfield_id: SIZE_FIELD_ID,    value: sizeValue     },
        ],
      };
    }),
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

  // 5) Read & parse Zoho’s response
  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    const text = await resp.text();
    console.error('Failed to parse Zoho JSON, raw:', text);
    body = { raw: text };
  }

  // 6) Handle errors or return success
  if (!resp.ok) {
    console.error('Zoho returned error status', resp.status, body);
    return NextResponse.json(body, { status: resp.status });
  }

  return NextResponse.json(body);
}