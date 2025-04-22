import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface SalesOrderLineItem {
  sku?: string;
  item_id?: string;
  quantity: number;
  rate: number;
  unit?: string;
}

export async function POST(request: NextRequest) {
  // 1) Parse raw JSON
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

  // 2) Required fields
  const custId = body['customer_id'];
  const dateRaw = body['date'];
  const itemsRaw = body['line_items'];
  if (typeof custId !== 'string') {
    return NextResponse.json({ error: 'Missing customer_id' }, { status: 400 });
  }
  if (typeof dateRaw !== 'string') {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 });
  }
  if (!Array.isArray(itemsRaw)) {
    return NextResponse.json({ error: 'Missing line_items' }, { status: 400 });
  }

  // 3) Build typed line_items
  const line_items: SalesOrderLineItem[] = [];
  for (const entry of itemsRaw) {
    if (typeof entry !== 'object' || entry === null) {
      return NextResponse.json({ error: 'Invalid line_items entry' }, { status: 400 });
    }
    const rec = entry as Record<string, unknown>;
    const qty = rec['quantity'];
    const rate = rec['rate'];
    if (typeof qty !== 'number' || typeof rate !== 'number') {
      return NextResponse.json(
        { error: 'line_items entries need numeric quantity & rate' },
        { status: 400 }
      );
    }
    const li: SalesOrderLineItem = { quantity: qty, rate };
    const skuVal = rec['sku'];
    if (typeof skuVal === 'string') li.sku = skuVal;
    const idVal = rec['item_id'];
    if (typeof idVal === 'string') li.item_id = idVal;
    const unitVal = rec['unit'];
    if (typeof unitVal === 'string') li.unit = unitVal;
    line_items.push(li);
  }

  // 4) Refresh Zoho OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  const token = await refreshZohoAccessToken().catch(err => {
    console.error('Auth error:', err);
    return null;
  });
  if (!token) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 5) Build Zoho payload
  const payload: Record<string, unknown> = {
    customer_id: custId,
    date: dateRaw,
    line_items,
  };
  const ship = body['shipment_date'];
  if (typeof ship === 'string') payload.shipment_date = ship;
  const ref = body['reference_number'];
  if (typeof ref === 'string') payload.reference_number = ref;
  const loc = body['location_id'];
  if (typeof loc === 'string') payload.location_id = loc;
  const ignore = body['ignore_auto_number_generation'];
  if (typeof ignore === 'boolean') payload.ignore_auto_number_generation = ignore;

  // 6) Call Zoho
  const url = `https://www.zohoapis.com/inventory/v1/salesorders?organization_id=${orgId}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
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

  // 7) Parse & forward Zoho’s response
  let zohoJson: unknown;
  try {
    zohoJson = await resp.json();
  } catch {
    return NextResponse.json({ error: 'Invalid Zoho response' }, { status: 502 });
  }
  if (!resp.ok) {
    return NextResponse.json(zohoJson, { status: resp.status });
  }
  return NextResponse.json(zohoJson);
}