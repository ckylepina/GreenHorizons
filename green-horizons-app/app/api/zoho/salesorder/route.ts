'use server';

import { NextRequest, NextResponse } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';
import { createClient } from '@/utils/supabase/server';

// guard for arbitrary JSON
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
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
  if (!isRecord(parsed) || typeof parsed.sale_id !== 'string') {
    return NextResponse.json({ error: 'Missing sale_id' }, { status: 400 });
  }
  const saleId = parsed.sale_id;

  const sb = await createClient();

  // 2) fetch sale + Zoho customer ID
  const { data: saleData, error: saleErr } = await sb
    .from('sales')
    .select(`sale_date, customer:customers(zoho_customer_id)`)
    .eq('id', saleId)
    .maybeSingle();
  if (saleErr || !saleData) {
    console.error('Error fetching sale', saleErr);
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  }
  const custArr = Array.isArray(saleData.customer) ? saleData.customer : [];
  const zohoCustomerId = custArr[0]?.zoho_customer_id;
  if (typeof zohoCustomerId !== 'string') {
    return NextResponse.json({ error: 'Customer not synced to Zoho' }, { status: 400 });
  }

  // 3) fetch sale items
  const { data: rawItems, error: itemsErr } = await sb
    .from('sale_items')
    .select(`bag: bags(product_type, qr_code), price`)
    .eq('sale_id', saleId);
  if (itemsErr) {
    console.error('Error fetching sale items', itemsErr);
    return NextResponse.json({ error: 'Failed loading items' }, { status: 500 });
  }
  const rows = rawItems ?? [];

  // 4) map into Zoho line_items
  const line_items = rows.map((r) => {
    if (!isRecord(r)) throw new Error('Invalid row');
    const bagField = r.bag;
    if (!Array.isArray(bagField) || bagField.length === 0 || !isRecord(bagField[0])) {
      throw new Error('Invalid bag data');
    }
    const bagObj = bagField[0];
    const product_type = String(bagObj.product_type);
    const qr_code      = String(bagObj.qr_code);
    const price        = Number(r.price);

    return {
      item_id:    Number(product_type),
      name:       qr_code,
      rate:       price,
      quantity:   1,
      unit:       'qty',
      item_total: price,
    };
  });

  // 5) get Zoho token & build payload
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not set' }, { status: 500 });
  }
  let token: string;
  try {
    token = await refreshZohoAccessToken();
  } catch (e) {
    console.error('Zoho auth error', e);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  const payload = {
    customer_id:      zohoCustomerId,
    date:             String(saleData.sale_date).split('T')[0],
    line_items,
    discount:         0,
    is_inclusive_tax: false,
  };

  // 6) call Zoho SalesOrders API
  const url = `https://www.zohoapis.com/inventory/v1/salesorders?organization_id=${orgId}`;
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
    console.error('Network error creating Zoho Sales Order', netErr);
    return NextResponse.json({ error: 'Network error' }, { status: 502 });
  }

  let zohoBody: unknown;
  try {
    zohoBody = await resp.json();
  } catch {
    console.error('Invalid JSON from Zoho salesorder');
    return NextResponse.json({ error: 'Invalid Zoho response' }, { status: 502 });
  }
  if (!resp.ok) {
    console.error('Zoho salesorder failed', resp.status, zohoBody);
    return NextResponse.json(zohoBody, { status: resp.status });
  }

  // 7) extract + persist salesorder_id
  if (
    !isRecord(zohoBody) ||
    !isRecord(zohoBody.salesorder) ||
    typeof zohoBody.salesorder.salesorder_id !== 'string'
  ) {
    console.error('Unexpected Zoho response', zohoBody);
    return NextResponse.json({ error: 'Missing salesorder_id' }, { status: 502 });
  }
  const soId = zohoBody.salesorder.salesorder_id;
  await sb.from('sales').update({ zoho_salesorder_id: soId }).eq('id', saleId);

  return NextResponse.json({ zoho_salesorder_id: soId });
}