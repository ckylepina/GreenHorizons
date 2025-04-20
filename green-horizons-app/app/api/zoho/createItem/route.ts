// app/api/zoho/createItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface ZohoItemPayload {
  sku: string;
  name: string;
  rate: number;
  purchase_rate: number;
  cf_harvest: string;
  cf_size: string;
}

export async function POST(request: NextRequest) {
  // 1) Parse body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Expected object with items array' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Missing or invalid "items" array' }, { status: 400 });
  }
  const items = body.items as ZohoItemPayload[];

  // 2) Get orgId & token
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

  // 3) Helper type‑guard for our thrown errors
  function isZohoError(err: unknown): err is { status: number; body: unknown } {
    return (
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number' &&
      'body' in err
    );
  }

  // 4) Create items in parallel
  try {
    const results = await Promise.all(
      items.map(async (item) => {
        // ensure harvest is never blank
        const harvestValue = item.cf_harvest.trim() || item.sku;

        const payload = {
          name:            item.name,
          sku:             item.sku,
          rate:            item.rate,
          purchase_rate:   item.purchase_rate,
          unit:            'qty',
          track_inventory: true,
          custom_fields: [
            { customfield_id: '6118005000000123236', value: harvestValue },
            { customfield_id: '6118005000000280001', value: item.cf_size    },
          ],
        };

        // debug log
        console.log('🧪 Sending to Zoho:', JSON.stringify(payload, null, 2));

        const resp = await fetch(
          `https://www.zohoapis.com/inventory/v1/items?organization_id=${orgId}`,
          {
            method:  'POST',
            headers: {
              Authorization: `Zoho-oauthtoken ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
        const json = await resp.json();
        if (!resp.ok) {
          console.error('Zoho createItem error:', json);
          throw { status: resp.status, body: json };
        }
        return json; // { item: { … } }
      })
    );

    return NextResponse.json({ items: results });
  } catch (err: unknown) {
    console.error('Error in createItem:', err);
    if (isZohoError(err)) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}