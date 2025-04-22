// app/api/zoho/createContact/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface CustomerPerson {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  is_primary_contact?: boolean;
}

interface ContactAddress {
  attention?: string;
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface CustomField {
  customfield_id: string;
  value: string;
}

interface CreateContactRequest {
  contact_name: string;
  company_name?: string;
  payment_terms?: number;
  currency_id?: number;
  website?: string;
  contact_type?: 'customer' | 'vendor';
  custom_fields?: CustomField[];
  billing_address?: ContactAddress;
  shipping_address?: ContactAddress;
  contact_persons?: CustomerPerson[];
}

export async function POST(request: NextRequest) {
  // 1) Parse & validate body
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Expected request body' }, { status: 400 });
  }
  const body = raw as CreateContactRequest;
  if (typeof body.contact_name !== 'string') {
    return NextResponse.json({ error: 'Missing contact_name' }, { status: 400 });
  }

  // 2) Org ID & OAuth
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // 3) Build Zoho payload
  const payload: Record<string, unknown> = {
    contact_name:  body.contact_name,
    company_name:  body.company_name ?? body.contact_name,
    contact_type:  body.contact_type  ?? 'customer',
  };
  if (body.payment_terms != null)  payload.payment_terms  = body.payment_terms;
  if (body.currency_id != null)    payload.currency_id    = body.currency_id;
  if (body.website)                payload.website        = body.website;
  if (body.custom_fields)          payload.custom_fields  = body.custom_fields;
  if (body.billing_address)        payload.billing_address  = body.billing_address;
  if (body.shipping_address)       payload.shipping_address = body.shipping_address;
  if (body.contact_persons)        payload.contact_persons  = body.contact_persons;

  // 4) Send to Zoho
  const url = `https://www.zohoapis.com/inventory/v1/contacts?organization_id=${orgId}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error('Network error calling Zoho:', networkErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  // 5) Parse & forward Zoho’s response
  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch (parseErr) {
    const rawText = await resp.text();
    console.error('Failed to parse Zoho response:', parseErr);
    zohoBody = { raw: rawText };
  }
  if (!resp.ok) {
    console.error('Zoho returned error:', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  return NextResponse.json(zohoBody);
}