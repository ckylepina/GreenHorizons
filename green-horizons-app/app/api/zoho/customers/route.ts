import { NextRequest, NextResponse } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';
import { createClient } from '@/utils/supabase/server';

// guard for arbitrary JSON
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  zoho_customer_id: string | null;
}

export async function POST(request: NextRequest) {
  // 1) parse + validate
  const raw = await request.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(parsed) || typeof parsed.supabase_customer_id !== 'string') {
    return NextResponse.json({ error: 'Missing supabase_customer_id' }, { status: 400 });
  }
  const supabaseCustomerId = parsed.supabase_customer_id;

  // 2) fetch from Supabase
  const sb = await createClient();
  const { data, error } = await sb
    .from('customers')
    .select('id, first_name, last_name, email, phone, business_name, zoho_customer_id')
    .eq('id', supabaseCustomerId)
    .maybeSingle();

  if (error) {
    console.error('DB error fetching customer:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  const cust = data as CustomerRow;

  // 3) if already synced
  if (cust.zoho_customer_id) {
    return NextResponse.json({ zoho_customer_id: cust.zoho_customer_id });
  }

  // 4) get Zoho token & build payload
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Org ID not set' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('Zoho auth error', e);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }

  const payload = {
    contact_name: `${cust.first_name} ${cust.last_name}`,
    company_name:  cust.business_name ?? undefined,
    email:         cust.email ?? undefined,
    phone:         cust.phone ?? undefined,
  };

  // 5) call Zoho
  const url = `https://www.zohoapis.com/inventory/v1/customers?organization_id=${orgId}`;
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

  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    console.error('Invalid JSON from Zoho');
    return NextResponse.json({ error: 'Invalid Zoho response' }, { status: 502 });
  }
  if (!resp.ok) {
    console.error('Zoho error', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  // 6) extract & save ID
  if (
    !isRecord(zohoBody) ||
    !isRecord(zohoBody.customer) ||
    typeof zohoBody.customer.customer_id !== 'string'
  ) {
    console.error('Unexpected Zoho response', zohoBody);
    return NextResponse.json({ error: 'Missing customer_id' }, { status: 502 });
  }
  const zohoCustomerId = zohoBody.customer.customer_id;
  await sb
    .from('customers')
    .update({ zoho_customer_id: zohoCustomerId })
    .eq('id', supabaseCustomerId);

  return NextResponse.json({ zoho_customer_id: zohoCustomerId });
}