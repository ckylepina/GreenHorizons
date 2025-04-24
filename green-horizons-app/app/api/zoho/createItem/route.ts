// app/api/zoho/createItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface PackageDetails {
  weight:      number;
  weight_unit: string;
}

interface CustomField {
  customfield_id: string;
  value:          string;
}

interface CreateItemBody {
  name:                 string;
  sku:                  string;
  rate:                 number;
  purchase_rate:        number;
  unit?:                string;
  item_type?:           'inventory' | 'sales' | 'purchases' | 'sales_and_purchases';
  product_type?:        'goods' | 'service';
  track_inventory?:     boolean;
  track_serial_number?: boolean;
  package_details?:     PackageDetails;
  custom_fields?:       CustomField[];
  locations?: {
    location_id:        string;
    initial_stock:      number;
    initial_stock_rate: number;
  }[];
  // NEW: accept current_status in the request body
  current_status?:      string;
}

// simple guard for objects
function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

// TODO: replace with your real Zoho custom field ID for “current_status”
const STATUS_FIELD_ID = '6118005000000325664';

export async function POST(request: NextRequest) {
  // 1) parse JSON
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isObject(rawBody)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }
  const body = rawBody as Record<string, unknown>;

  // 2) required fields
  const name          = String(body.name ?? '').trim();
  const sku           = String(body.sku  ?? '').trim();
  const rate          = Number(body.rate);
  const purchase_rate = Number(body.purchase_rate);

  if (!name || !sku || isNaN(rate) || isNaN(purchase_rate)) {
    return NextResponse.json(
      { error: 'Missing or invalid name, sku, rate or purchase_rate' },
      { status: 400 }
    );
  }

  // 3) build base payload
  const payload: CreateItemBody = {
    name,
    sku,
    rate,
    purchase_rate,
    unit:                 typeof body.unit === 'string' ? body.unit : 'qty',
    item_type:            'inventory',
    product_type:         'goods',
    track_inventory:      true,
    track_serial_number:  true,
  };

  // 3a) optional package_details
  if (isObject(body.package_details)) {
    const pd = body.package_details as Record<string, unknown>;
    const w  = Number(pd.weight);
    const wu = String(pd.weight_unit ?? '');
    if (!isNaN(w) && wu) {
      payload.package_details = { weight: w, weight_unit: wu };
    }
  }

  // 3b) optional custom_fields (harvest & size)
  if (Array.isArray(body.custom_fields)) {
    payload.custom_fields = (body.custom_fields as unknown[])
      .filter(isObject)
      .map((cf) => ({
        customfield_id: String((cf as Record<string, unknown>).customfield_id ?? ''),
        value:          String((cf as Record<string, unknown>).value ?? ''),
      }));
  } else {
    payload.custom_fields = [];
  }

  // 3c) append your bag’s current_status as a Zoho custom field
  if (typeof body.current_status === 'string' && body.current_status.trim() !== '') {
    payload.custom_fields.push({
      customfield_id: STATUS_FIELD_ID,
      value:          body.current_status.trim(),
    });
  }

  // 3d) seed inventory: one bag per item into your warehouse
  const OPENING_RATE = purchase_rate > 0 ? purchase_rate : 1;
  payload.locations = [
    {
      location_id:        '6118005000000091160', // your warehouse ID
      initial_stock:      1,                     // one bag on-hand
      initial_stock_rate: OPENING_RATE,          // > 0
    },
  ];

  console.log('🧪 [Server] createItem payload:', JSON.stringify(payload, null, 2));

  // 4) get Zoho org ID + access token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not set' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // 5) call Zoho Create Item API
  const url = `https://www.zohoapis.com/inventory/v1/items?organization_id=${orgId}`;
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
  } catch (netErr) {
    console.error('Network error:', netErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 6) parse Zoho response
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    const text = await resp.text();
    console.error('Non-JSON Zoho response:', text);
    zohoBody = { raw: text };
  }

  if (!resp.ok) {
    console.error('🛑 Zoho createItem error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody as object, { status: resp.status });
  }

  console.log('✅ Zoho createItem success:', zohoBody);
  return NextResponse.json(zohoBody as object);
}