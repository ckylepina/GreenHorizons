// app/api/zoho/createItemGroup/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

const HARVEST_FIELD = 'cf_harvest';
const SIZE_FIELD    = 'cf_size';

// A little type‐guard
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate incoming JSON
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(payload)) {
    return NextResponse.json(
      { error: 'Expected an object with an "items" array' },
      { status: 400 }
    );
  }

  const itemsRaw = payload['items'];
  if (!Array.isArray(itemsRaw)) {
    return NextResponse.json(
      { error: 'Missing or invalid "items" array' },
      { status: 400 }
    );
  }

  // 2) OAuth setup
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
    console.error('Auth error refreshing Zoho token:', e);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }

  // 3) Build the Zoho Item Group payload
  type ZohoItem = {
    name: string;
    sku: string;
    rate: number;
    purchase_rate: number;
    unit: 'qty';
    track_inventory: true;
    [HARVEST_FIELD]: string;
    [SIZE_FIELD]: string;
  };

  const groupPayload = {
    group_name: 'Bags',
    unit:       'qty' as const,
    items: itemsRaw.map((entry): ZohoItem => {
      if (!isRecord(entry)) {
        throw new Error('Invalid item entry');
      }

      const sku           = String(entry['sku'] ?? '');
      const name          = String(entry['name'] ?? '');
      const rate          = Number(entry['rate'] ?? 0);
      const purchase_rate = Number(entry['purchase_rate'] ?? 0);

      // Pull custom values off the incoming record
      const harvestValRaw = entry[HARVEST_FIELD];
      const sizeValRaw    = entry[SIZE_FIELD];
      const harvestValue  =
        typeof harvestValRaw === 'string' && harvestValRaw.trim() !== ''
          ? harvestValRaw.trim()
          : sku;
      const sizeValue =
        typeof sizeValRaw === 'string'
          ? sizeValRaw.trim()
          : '';

      return {
        name,
        sku,
        rate,
        purchase_rate,
        unit:            'qty',
        track_inventory: true,
        [HARVEST_FIELD]: harvestValue,
        [SIZE_FIELD]:    sizeValue,
      };
    }),
  };

  console.log(
    '🧪 [Server] createItemGroup payload:',
    JSON.stringify(groupPayload, null, 2)
  );

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
      body: JSON.stringify(groupPayload),
    });
  } catch (networkErr) {
    console.error('Network error calling Zoho:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 5) Parse Zoho’s response
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    const text = await resp.text();
    console.error('Failed to parse Zoho JSON:', text);
    zohoBody = { raw: text };
  }

  // 6) Forward any Zoho error
  if (!resp.ok) {
    console.error('🛑 Zoho error status:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  // 7) Success
  console.log('✅ Zoho success:', zohoBody);
  return NextResponse.json(zohoBody);
}