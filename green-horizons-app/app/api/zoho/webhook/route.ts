// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

export async function POST(request: NextRequest) {
  // … signature check omitted for brevity …

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // validate shape
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as any).module !== 'string' ||
    typeof (payload as any).action !== 'string' ||
    typeof (payload as any).data !== 'object'
  ) {
    return NextResponse.json({ error: 'Unexpected payload' }, { status: 400 });
  }

  const { module, action, data } = payload as {
    module: string;
    action: string;
    data: Record<string, unknown>;
  };

  if (module !== 'items') {
    return NextResponse.json({ status: 'ignored' });
  }

  // extract sku
  const sku = String(data.sku ?? '');
  if (!sku) {
    return NextResponse.json({ error: 'Missing SKU' }, { status: 400 });
  }

  // extract Weight (Zoho sometimes uses "Weight" or "weight")
  const rawWeight = String(data.Weight ?? data.weight ?? '0');
  const weightNum = parseFloat(rawWeight);

  // extract custom_fields array
  const customFields = Array.isArray(data.custom_fields)
    ? (data.custom_fields as any[])
    : [];

  let harvestRoom = '';
  let sizeName    = '';
  for (const cf of customFields) {
    if (
      cf &&
      typeof cf === 'object' &&
      String((cf as any).customfield_id) === HARVEST_FIELD_ID
    ) {
      harvestRoom = String((cf as any).value);
    }
    if (
      cf &&
      typeof cf === 'object' &&
      String((cf as any).customfield_id) === SIZE_FIELD_ID
    ) {
      sizeName = String((cf as any).value);
    }
  }

  // now upsert into Supabase
  const supabase = await createClient();
  const now = new Date().toISOString();

  try {
    if (action === 'created' || action === 'edited') {
      const { error: upsertErr } = await supabase
        .from('bags')
        .upsert({
          qr_code:          sku,
          harvest_room_id:  harvestRoom,
          strain_id:        String(data.name ?? ''),  // assuming name→strain
          size_category_id: sizeName,
          weight:           weightNum,
          current_status:   'in_inventory',
          updated_at:       now,
          created_at:       now,
        });
      if (upsertErr) throw upsertErr;
    } else if (action === 'deleted') {
      const { error: deleteErr } = await supabase
        .from('bags')
        .delete()
        .eq('qr_code', sku);
      if (deleteErr) throw deleteErr;
    }
  } catch (err) {
    console.error('DB error handling webhook:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}