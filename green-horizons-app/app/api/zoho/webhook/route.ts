// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/utils/supabase/server';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000303114';
// replace with your Zoho custom‐field ID for "current_status"
const STATUS_FIELD_ID  = '6118005000000325664';
// the same warehouse ID you seeded on create
const WAREHOUSE_ID     = '6118005000000091160';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  // 0) verify secret
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing ZOHO_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const rawBody     = await request.text();
  const incomingSig = request.headers.get('X-ZOHO-SIGNATURE') ?? '';
  const expectedSig = createHmac('sha256', secret).update(rawBody).digest('base64');
  if (incomingSig !== expectedSig) {
    console.error('Invalid signature', { incomingSig, expectedSig });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 1) parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.error('Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isRecord(parsed)) {
    return NextResponse.json({ error: 'Unexpected payload' }, { status: 400 });
  }

  // 2) extract module/action/data
  const moduleName = String(parsed.module ?? '');
  const action     = String(parsed.action ?? '');
  const dataRaw    = parsed.data;
  if (!moduleName || !action || (!isRecord(dataRaw) && !Array.isArray(dataRaw))) {
    return NextResponse.json({ error: 'Unexpected webhook payload' }, { status: 400 });
  }
  const items = Array.isArray(dataRaw) ? dataRaw : [dataRaw];

  // 3) supabase client
  const supabase = await createClient();
  const now      = new Date().toISOString();

  // 4) upsert helper
  async function upsertBag(item: unknown) {
    if (!isRecord(item)) throw new Error('Invalid item');
    const sku    = String(item.sku ?? '');
    const zohoId = String(item.item_id ?? '');

    // parse custom fields
    const cfArr = Array.isArray(item.custom_fields) ? item.custom_fields as unknown[] : [];
    let harvestRoom  = '';
    let sizeName     = '';
    let statusValue  = '';
    for (const cf of cfArr) {
      if (!isRecord(cf)) continue;
      const id  = String(cf.customfield_id ?? '');
      const val = cf.value;
      if (id === HARVEST_FIELD_ID && typeof val === 'string') {
        harvestRoom = val;
      } else if (id === SIZE_FIELD_ID && typeof val === 'string') {
        sizeName = val;
      } else if (id === STATUS_FIELD_ID && typeof val === 'string') {
        statusValue = val;
      }
    }

    // default status to in_inventory if missing
    const currentStatus = statusValue || 'in_inventory';

    // upsert into bags table
    const { error } = await supabase
      .from('bags')
      .upsert({
        qr_code:          sku,
        harvest_room_id:  harvestRoom,
        strain_id:        String(item.name ?? ''),
        size_category_id: sizeName,
        zoho_item_id:     zohoId,
        current_status:   currentStatus,
        created_at:       now,
        updated_at:       now,
      });
    if (error) throw error;
    console.log('📬 Bag upserted:', sku, 'status:', currentStatus);
  }

  // 5) delete helper
  async function deleteBag(item: unknown) {
    if (!isRecord(item)) throw new Error('Invalid item');
    const sku = String(item.sku ?? '');
    const { error } = await supabase
      .from('bags')
      .delete()
      .eq('qr_code', sku);
    if (error) throw error;
    console.log('🗑️ Bag deleted:', sku);
  }

  // 6) handle events
  try {
    if (moduleName === 'items') {
      for (const itm of items) {
        if (action === 'created') {
          await upsertBag(itm);
        } else if (action === 'edited') {
          // check on-hand for your warehouse
          let qty = 1;
          if (isRecord(itm) && Array.isArray(itm.locations)) {
            for (const loc of itm.locations as unknown[]) {
              if (!isRecord(loc)) continue;
              if (String(loc.location_id) === WAREHOUSE_ID) {
                qty = Number(loc.on_hand_quantity ?? loc.initial_stock ?? 0);
                break;
              }
            }
          }
          if (qty <= 0) {
            await deleteBag(itm);
          } else {
            await upsertBag(itm);
          }
        } else if (action === 'deleted') {
          await deleteBag(itm);
        }
      }
    } else if (moduleName === 'itemgroups') {
      for (const grp of items) {
        if (!isRecord(grp)) continue;
        const comps = Array.isArray(grp.items) ? grp.items as unknown[] : [];
        for (const itm of comps) {
          if (action === 'created' || action === 'edited') {
            await upsertBag(itm);
          } else if (action === 'deleted') {
            await deleteBag(itm);
          }
        }
      }
    } else {
      console.warn('Ignored module:', moduleName);
    }
  } catch (err: unknown) {
    console.error('DB error handling webhook:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
