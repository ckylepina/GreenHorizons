// app/api/zoho/createItemGroup/route.ts
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
  // 1) Parse + validate body
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

  // 2) Org ID & OAuth
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

  // 3) Build group payload
  const payload = {
    group_name: 'Bags',
    unit:       'qty',
    items: items.map(item => {
      // ensure harvest is never blank
      const harvestValue = item.cf_harvest.trim() || item.sku;
      return {
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
    }),
  };

  console.log('🧪 [Server] createItemGroup payload →', JSON.stringify(payload, null, 2));

  // 4) Send to Zoho
  const url = `https://www.zohoapis.com/inventory/v1/itemgroups?organization_id=${orgId}`;
  let resp: Response, json: unknown;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    json = await resp.json();
  } catch (e) {
    console.error('Network error calling Zoho:', e);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  if (!resp.ok) {
    console.error('Zoho createItemGroup error:', json);
    return NextResponse.json(json, { status: resp.status });
  }

  // 5) Success
  return NextResponse.json(json);
}