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
  // 1) Parse body as unknown
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  // 2) Must be an object
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Payload must be an object with an "items" array' },
      { status: 400 }
    );
  }
  const record = body as Record<string, unknown>;

  // 3) Validate "items" exists and is an array
  if (!('items' in record) || !Array.isArray(record.items)) {
    return NextResponse.json(
      { error: 'Missing or invalid "items" array' },
      { status: 400 }
    );
  }

  // 4) Narrow & validate each entry in that array
  const rawItems = record.items;
  const items: ZohoItemPayload[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const itm = rawItems[i];
    if (typeof itm !== 'object' || itm === null) {
      return NextResponse.json(
        { error: `Item at index ${i} is not an object` },
        { status: 400 }
      );
    }
    const entry = itm as Record<string, unknown>;

    const {
      sku,
      name,
      rate,
      purchase_rate,
      attribute_option_name1,
      cf_harvest,
      cf_size,
      weight,
    } = entry;

    if (
      typeof sku !== 'string' ||
      typeof name !== 'string' ||
      typeof rate !== 'number' ||
      typeof purchase_rate !== 'number' ||
      typeof attribute_option_name1 !== 'string' ||
      typeof cf_harvest !== 'string' ||
      typeof cf_size !== 'string' ||
      typeof weight !== 'number'
    ) {
      return NextResponse.json(
        { error: `Invalid or missing fields on item at index ${i}` },
        { status: 400 }
      );
    }

    items.push({
      sku,
      name,
      rate,
      purchase_rate,
      cf_harvest,
      cf_size,
      weight,
    });
  }

  // 5) Load Zoho org ID & refresh token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json(
      { error: 'Zoho organization ID not configured' },
      { status: 500 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await refreshZohoAccessToken();
  } catch (err: unknown) {
    console.error('Error refreshing Zoho token:', err);
    return NextResponse.json(
      { error: 'Failed to authenticate with Zoho' },
      { status: 500 }
    );
  }

  // 6) Construct Zoho payload
  const payload = {
    group_name: 'Test',
    unit: 'qty',
    items: items.map(item => ({
      name: item.name,
      sku: item.sku,
      rate: item.rate,
      purchase_rate: item.purchase_rate,
      cf_harvest: item.cf_harvest,
      cf_size:   item.cf_size,
      Weight:    Number.isInteger(item.weight)
                    ? item.weight
                    : Number(item.weight.toFixed(2)),
    })),
  };

  // 7) Send to Zoho
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
  if (!resp.ok) {
    console.error('Zoho error response:', result);
    return NextResponse.json(
      { error: result },
      { status: resp.status }
    );
  }

  return NextResponse.json(result);
}