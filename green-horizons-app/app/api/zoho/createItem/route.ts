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
  name:            string;
  sku:             string;
  rate:            number;
  purchase_rate:   number;
  unit?:           string;
  track_inventory?:boolean;
  package_details?: PackageDetails;
  custom_fields?:   CustomField[];
}

// simple object‑guard
function isObject(x: unknown): x is Record<string, unknown> {
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
  if (!isObject(raw)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

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

  // 3) build payload
  const payload: CreateItemBody = {
    name,
    sku,
    rate,
    purchase_rate,
    unit:            typeof body.unit === 'string'  ? body.unit  : 'qty',
    track_inventory: typeof body.track_inventory === 'boolean' ? body.track_inventory : true,
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

  // 3b) optional custom_fields
  if (Array.isArray(body.custom_fields)) {
    payload.custom_fields = (body.custom_fields as unknown[])
      .filter(isObject)
      .map((cf) => ({
        customfield_id: String((cf as Record<string, unknown>).customfield_id ?? ''),
        value:          String((cf as Record<string, unknown>).value ?? ''),
      }));
  }

  console.log('🧪 [Server] createItem payload:', JSON.stringify(payload, null, 2));

  // 4) get org ID + token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not set' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('Auth error:', e);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // 5) call Zoho
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

  // 6) parse response
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    const txt = await resp.text();
    console.error('Non-JSON Zoho response:', txt);
    zohoBody = { raw: txt };
  }

  if (!resp.ok) {
    console.error('🛑 Zoho createItem error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  console.log('✅ Zoho createItem success:', zohoBody);
  return NextResponse.json(zohoBody);
}