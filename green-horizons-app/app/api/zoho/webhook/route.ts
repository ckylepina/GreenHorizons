// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/utils/supabase/server';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

export async function POST(request: NextRequest) {
  // 0) Ensure secret is set
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing ZOHO_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // 1) Read raw body & verify signature
  const rawBody    = await request.text();
  const incomingSig = request.headers.get('X-ZOHO-SIGNATURE') ?? '';
  const expectedSig = createHmac('sha256', secret).update(rawBody).digest('base64');
  if (incomingSig !== expectedSig) {
    console.error('Invalid signature', { incomingSig, expectedSig });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2) Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.error('Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return NextResponse.json({ error: 'Unexpected payload shape' }, { status: 400 });
  }
  const payload = parsed as Record<string, unknown>;

  // 3) Validate module/action/data
  const moduleRaw = payload['module'];
  const actionRaw = payload['action'];
  const dataRaw   = payload['data'];
  if (
    typeof moduleRaw !== 'string' ||
    typeof actionRaw !== 'string' ||
    typeof dataRaw   !== 'object' ||
    dataRaw === null
  ) {
    return NextResponse.json({ error: 'Unexpected webhook payload' }, { status: 400 });
  }
  const moduleName = moduleRaw;
  const action     = actionRaw;
  const dataObj    = dataRaw as Record<string, unknown>;

  // 4) Only handle items
  if (moduleName !== 'items') {
    return NextResponse.json({ status: 'ignored' });
  }

  // 5) Extract SKU & weight
  const skuRaw    = dataObj['sku'];
  const sku       = typeof skuRaw === 'string' ? skuRaw : String(skuRaw ?? '');
  const weightRaw = dataObj['Weight'] ?? dataObj['weight'] ?? '0';
  const weight    = parseFloat(String(weightRaw));

  // 6) Extract custom_fields
  const cfRaw   = dataObj['custom_fields'];
  const cfArray = Array.isArray(cfRaw) ? cfRaw : [];
  let harvestRoom = '';
  let sizeName    = '';
  for (const entry of cfArray) {
    if (typeof entry !== 'object' || entry === null) continue;
    const cf = entry as Record<string, unknown>;
    const idVal = cf['customfield_id'];
    const val   = cf['value'];
    if (String(idVal) === HARVEST_FIELD_ID && typeof val === 'string') {
      harvestRoom = val;
    }
    if (String(idVal) === SIZE_FIELD_ID && typeof val === 'string') {
      sizeName = val;
    }
  }

  // 7) Sync to Supabase
  const supabase = await createClient();
  const now      = new Date().toISOString();
  try {
    if (action === 'created' || action === 'edited') {
      const { error } = await supabase
        .from('bags')
        .upsert({
          qr_code:          sku,
          harvest_room_id:  harvestRoom,
          strain_id:        String(dataObj['name'] ?? ''),
          size_category_id: sizeName,
          weight,
          current_status:   'in_inventory',
          updated_at:       now,
          created_at:       now,
        });
      if (error) throw error;
      console.log('📬 Bag upserted:', sku);
    } else if (action === 'deleted') {
      const { error } = await supabase
        .from('bags')
        .delete()
        .eq('qr_code', sku);
      if (error) throw error;
      console.log('🗑️ Bag deleted:', sku);
    }
  } catch (err) {
    console.error('DB error handling webhook:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}