// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/utils/supabase/server';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000280001';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 0) Secret check
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing ZOHO_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // 1) Verify signature
  const rawBody     = await request.text();
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
  if (!isRecord(parsed)) {
    return NextResponse.json({ error: 'Unexpected payload shape' }, { status: 400 });
  }
  const payload = parsed;

  // 3) Extract module/action/data
  const moduleRaw = payload['module'];
  const actionRaw = payload['action'];
  const dataRaw   = payload['data'];
  if (
    typeof moduleRaw !== 'string' ||
    typeof actionRaw !== 'string' ||
    !isRecord(dataRaw) && !Array.isArray(dataRaw)
  ) {
    return NextResponse.json({ error: 'Unexpected webhook payload' }, { status: 400 });
  }
  const moduleName = moduleRaw;
  const action     = actionRaw;
  const data       = dataRaw;

  // 4) Supabase client ready
  const supabase = await createClient();
  const now      = new Date().toISOString();

  // helper: upsert one bag object from Zoho
  async function upsertBag(item: unknown) {
    if (!isRecord(item)) throw new Error('Invalid item');
    const sku = String(item['sku'] ?? '');
    const zohoId = String(item['item_id'] ?? '');
    // pull out custom_fields
    const cfRaw   = item['custom_fields'];
    const cfArray = Array.isArray(cfRaw) ? cfRaw : [];
    let harvestRoom = '';
    let sizeName    = '';

    for (const cf of cfArray) {
      if (!isRecord(cf)) continue;
      const idVal = String(cf['customfield_id'] ?? '');
      const val   = cf['value'];
      if (idVal === HARVEST_FIELD_ID && typeof val === 'string') {
        harvestRoom = val;
      } else if (idVal === SIZE_FIELD_ID && typeof val === 'string') {
        sizeName = val;
      }
    }

    // upsert into bags
    const { error } = await supabase
      .from('bags')
      .upsert({
        qr_code:          sku,
        harvest_room_id:  harvestRoom,
        strain_id:        String(item['name'] ?? ''),
        size_category_id: sizeName,
        zoho_item_id:   zohoId,
        current_status:   'in_inventory',
        updated_at:       now,
        created_at:       now,
      });
    if (error) throw error;
    console.log('📬 Bag upserted:', sku);
  }

  // helper: delete one bag
  async function deleteBag(item: unknown) {
    if (!isRecord(item)) throw new Error('Invalid item');
    const sku = String(item['sku'] ?? '');
    const { error } = await supabase
      .from('bags')
      .delete()
      .eq('qr_code', sku);
    if (error) throw error;
    console.log('🗑️ Bag deleted:', sku);
  }

  try {
    if (moduleName === 'items') {
      // single item
      if (action === 'created' || action === 'edited') {
        await upsertBag(data);
      } else if (action === 'deleted') {
        await deleteBag(data);
      }
    } else if (moduleName === 'itemgroups') {
      // one or more groups
      const groups = Array.isArray(data) ? data : [data];
      for (const grp of groups) {
        if (!isRecord(grp)) continue;
        const itemsRaw = grp['items'];
        const itemsArr = Array.isArray(itemsRaw) ? itemsRaw : [];
        for (const itm of itemsArr) {
          if (action === 'created' || action === 'edited') {
            await upsertBag(itm);
          } else if (action === 'deleted') {
            await deleteBag(itm);
          }
        }
      }
    } else {
      console.warn('Unhandled module:', moduleName);
    }
  } catch (err: unknown) {
    console.error('DB error handling webhook:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}