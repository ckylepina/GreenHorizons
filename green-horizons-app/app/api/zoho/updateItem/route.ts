// app/api/zoho/updateItem/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';
import { createClient } from '@/utils/supabase/server';

interface UpdateItemRequest {
  sku: string;
  harvest_room_id?: string;
  strain_id?: string;
  size_category_id?: string;
  weight?: number;
}

interface CustomField {
  customfield_id: string;
  value: string;
}

interface UpdatePayload {
  name?: string;
  attribute_option_name1?: string;
  custom_fields?: CustomField[];
}

export async function POST(request: NextRequest) {
  // 1) Parse & validate input JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { sku, harvest_room_id, strain_id, size_category_id, weight } =
    body as UpdateItemRequest;
  if (!sku) {
    return NextResponse.json({ error: 'Missing sku' }, { status: 400 });
  }

  // 2) Look up human‑readable names if IDs changed
  const supabase = await createClient();
  let roomName: string | undefined;
  let strainName: string | undefined;
  let sizeName: string | undefined;

  if (harvest_room_id) {
    const { data: r } = await supabase
      .from('harvest_rooms')
      .select('name')
      .eq('id', harvest_room_id)
      .single();
    roomName = r?.name;
  }
  if (strain_id) {
    const { data: s } = await supabase
      .from('strains')
      .select('name')
      .eq('id', strain_id)
      .single();
    strainName = s?.name;
  }
  if (size_category_id) {
    const { data: sz } = await supabase
      .from('bag_size_categories')
      .select('name')
      .eq('id', size_category_id)
      .single();
    sizeName = sz?.name;
  }

  // 3) Refresh Zoho access token
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err: unknown) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  // 4) Build the Zoho update payload
  const updatePayload: UpdatePayload = {};

  // If any of the name components changed, rebuild the item name
  if (roomName || strainName || sizeName || weight !== undefined) {
    const parts: string[] = [];
    if (roomName) parts.push(roomName);
    if (strainName) parts.push(strainName);
    if (sizeName) parts.push(sizeName);
    if (weight !== undefined) parts.push(`${weight}`);
    updatePayload.name = parts.join(' – ');
  }

  if (sizeName) {
    updatePayload.attribute_option_name1 = sizeName;
  }

  // Initialize custom_fields if any custom data will be added
  const customFields: CustomField[] = [];
  if (roomName)   customFields.push({ customfield_id: '46000000012845', value: roomName });
  if (strainName) customFields.push({ customfield_id: '46000000012846', value: strainName });
  if (sizeName)   customFields.push({ customfield_id: '46000000012847', value: sizeName });
  if (weight !== undefined) customFields.push({ customfield_id: '46000000012847', value: String(weight) });

  if (customFields.length > 0) {
    updatePayload.custom_fields = customFields;
  }

  // 5) Call Zoho’s Update Item endpoint
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'No organization ID configured' }, { status: 500 });
  }

  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`;

  let resp: Response;
  let zohoResult: unknown;
  try {
    resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
    zohoResult = await resp.json();
  } catch (err: unknown) {
    console.error('Network error calling Zoho:', err);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  if (!resp.ok) {
    console.error('Zoho update error:', zohoResult);
    return NextResponse.json({ error: zohoResult }, { status: resp.status });
  }

  return NextResponse.json({ status: 'ok', result: zohoResult });
}