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
  weight: number;
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || !('items' in body) || !Array.isArray((body as any).items)) {
    return NextResponse.json({ error: 'Missing or invalid "items" array' }, { status: 400 });
  }
  const { items } = body as { items: ZohoItemPayload[] };

  // 2) Load org ID & access token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  let accessToken: string;
  try {
    accessToken = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Error refreshing Zoho token:', err);
    return NextResponse.json({ error: 'Auth failure' }, { status: 500 });
  }

  // 3) Build payload
  const payload = {
    group_name: 'Bags',
    unit: 'qty',
    items: items.map(item => ({
      name:           item.name,
      sku:            item.sku,
      rate:           item.rate,
      purchase_rate:  item.purchase_rate,
      Weight:         Number.isInteger(item.weight) ? item.weight : Number(item.weight.toFixed(2)),
      custom_fields: [
        {
          customfield_id: '6118005000000123236', // Harvest # field ID
          value:           item.cf_harvest
        },
        {
          customfield_id: '6118005000000280001', // Size field ID
          value:           item.cf_size
        }
      ]
    }))
  };

  // 4) Send to Zoho
  const resp = await fetch(
    `https://www.zohoapis.com/inventory/v1/itemgroups?organization_id=${orgId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  const result = await resp.json();

  // 5) Handle response
  if (!resp.ok) {
    console.error('Zoho error response:', result);
    return NextResponse.json({ error: result }, { status: resp.status });
  }
  return NextResponse.json(result);
}