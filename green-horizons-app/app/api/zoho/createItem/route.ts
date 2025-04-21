// app/api/zoho/createItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface LocationEntry {
  location_id:          string;
  initial_stock:        number;
  initial_stock_rate:   number;
}

interface ItemTaxPreference {
  tax_id:             number;
  tax_specification:  string;
}

interface CustomField {
  customfield_id:     string;
  value:              string;
}

interface CreateItemBody {
  group_id?:              number;
  group_name?:            string;
  unit?:                  string;
  documents?:             string[];
  item_type?:             string;
  product_type?:          string;
  is_taxable?:            boolean;
  tax_id?:                number;
  description?:           string;
  purchase_account_id?:   number;
  inventory_account_id?:  number;
  attribute_name1?:       string;
  name:                   string;   // required
  rate:                   number;   // required
  purchase_rate:          number;
  reorder_level?:         number;
  locations?:             LocationEntry[];
  vendor_id?:             number;
  vendor_name?:           string;
  sku:                    string;   // required
  upc?:                   string;
  ean?:                   string;
  isbn?:                  string;
  part_number?:           string;
  attribute_option_name1?:string;
  purchase_description?:  string;
  item_tax_preferences?:  ItemTaxPreference[];
  hsn_or_sac?:            number;
  sat_item_key_code?:     string;
  unitkey_code?:          string;
  custom_fields?:         CustomField[];
}

// type‐guard
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 1) Parse & validate JSON
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(raw)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  // Required fields
  const name = String(body.name ?? '').trim();
  const sku  = String(body.sku  ?? '').trim();
  const rate = Number(body.rate);
  const purchase_rate = Number(body.purchase_rate);

  if (!name || !sku || isNaN(rate) || isNaN(purchase_rate)) {
    return NextResponse.json(
      { error: 'Missing or invalid required fields: name, sku, rate, purchase_rate' },
      { status: 400 }
    );
  }

  // 2) Build payload exactly as Zoho expects
  const payload: CreateItemBody = {
    // optional envelope fields—only include if present
    ...(body.group_id               !== undefined && { group_id: Number(body.group_id) }),
    ...(body.group_name             !== undefined && { group_name: String(body.group_name) }),
    ...(body.unit                   !== undefined && { unit: String(body.unit) }),
    ...(body.documents              !== undefined && { documents: body.documents as string[] }),
    ...(body.item_type              !== undefined && { item_type: String(body.item_type) }),
    ...(body.product_type           !== undefined && { product_type: String(body.product_type) }),
    ...(body.is_taxable             !== undefined && { is_taxable: Boolean(body.is_taxable) }),
    ...(body.tax_id                 !== undefined && { tax_id: Number(body.tax_id) }),
    ...(body.description            !== undefined && { description: String(body.description) }),
    ...(body.purchase_account_id    !== undefined && { purchase_account_id: Number(body.purchase_account_id) }),
    ...(body.inventory_account_id   !== undefined && { inventory_account_id: Number(body.inventory_account_id) }),
    ...(body.attribute_name1        !== undefined && { attribute_name1: String(body.attribute_name1) }),
    name,
    rate,
    purchase_rate,
    ...(body.reorder_level          !== undefined && { reorder_level: Number(body.reorder_level) }),
    ...(Array.isArray(body.locations) && { locations: body.locations as LocationEntry[] }),
    ...(body.vendor_id              !== undefined && { vendor_id: Number(body.vendor_id) }),
    ...(body.vendor_name            !== undefined && { vendor_name: String(body.vendor_name) }),
    sku,
    ...(body.upc                    !== undefined && { upc: String(body.upc) }),
    ...(body.ean                    !== undefined && { ean: String(body.ean) }),
    ...(body.isbn                   !== undefined && { isbn: String(body.isbn) }),
    ...(body.part_number            !== undefined && { part_number: String(body.part_number) }),
    ...(body.attribute_option_name1 !== undefined && { attribute_option_name1: String(body.attribute_option_name1) }),
    ...(body.purchase_description   !== undefined && { purchase_description: String(body.purchase_description) }),
    ...(Array.isArray(body.item_tax_preferences) && {
      item_tax_preferences: body.item_tax_preferences as ItemTaxPreference[]
    }),
    ...(body.hsn_or_sac             !== undefined && { hsn_or_sac: Number(body.hsn_or_sac) }),
    ...(body.sat_item_key_code      !== undefined && { sat_item_key_code: String(body.sat_item_key_code) }),
    ...(body.unitkey_code           !== undefined && { unitkey_code: String(body.unitkey_code) }),
    ...(Array.isArray(body.custom_fields) && {
      custom_fields: body.custom_fields as CustomField[]
    }),
  };

  console.log(
    '🧪 [Server] createItem payload →',
    JSON.stringify(payload, null, 2)
  );

  // 3) Get OAuth token & Org ID
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Org ID not configured' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // 4) Call Zoho
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
  } catch (networkErr) {
    console.error('Network error calling Zoho:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 5) Parse Zoho’s response (or raw text if JSON fails)
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    const rawText = await resp.text();
    console.error('Failed to parse Zoho response JSON:', rawText);
    zohoBody = { raw: rawText };
  }

  // 6) Forward error or success
  if (!resp.ok) {
    console.error('🛑 Zoho responded with status', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  console.log('✅ Zoho createItem succeeded:', zohoBody);
  return NextResponse.json(zohoBody);
}