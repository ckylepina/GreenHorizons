// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/utils/supabase/server';

const HARVEST_FIELD_ID = '6118005000000123236';
const SIZE_FIELD_ID    = '6118005000000303114';
// The Zoho location you seed on create:
const YOUR_WAREHOUSE_ID = '6118005000000091160';

// Type-guard for any object
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

  // 3) Extract module / action / data
  const moduleRaw = payload['module'];
  const actionRaw = payload['action'];
  const dataRaw   = payload['data'];
  if (
    typeof moduleRaw !== 'string' ||
    typeof actionRaw !== 'string' ||
    (!isRecord(dataRaw) && !Array.isArray(dataRaw))
  ) {
    return NextResponse.json({ error: 'Unexpected webhook payload' }, { status: 400 });
  }
  const moduleName = moduleRaw;
  const action     = actionRaw;
  // Normalize to an array of items for easier looping:
  const items = Array.isArray(dataRaw) ? dataRaw : [dataRaw];

  // 4) Supabase ready
  const supabase = await createClient();
  const now      = new Date().toISOString();

  // Upsert or delete based on Zoho data
  async function upsertBag(item: unknown) {
    if (!isRecord(item)) throw new Error('Invalid item');
    const sku = String(item['sku'] ?? '');
    const zohoId = String(item['item_id'] ?? '');

    // Extract custom_fields
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

    // Upsert into Supabase
    const { error } = await supabase
      .from('bags')
      .upsert({
        qr_code:          sku,
        harvest_room_id:  harvestRoom,
        strain_id:        String(item['name'] ?? ''),
        size_category_id: sizeName,
        zoho_item_id:     zohoId,
        current_status:   'in_inventory',
        updated_at:       now,
        created_at:       now,
      });
    if (error) throw error;
    console.log('📬 Bag upserted:', sku);
  }

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
      for (const itm of items) {
        // On create → always upsert
        if (action === 'created') {
          await upsertBag(itm);

        // On edit → check warehouse stock
        } else if (action === 'edited') {
          let qty = 1;
          if (isRecord(itm) && Array.isArray(itm['locations'])) {
            for (const loc of itm['locations'] as unknown[]) {
              if (isRecord(loc) && String(loc['location_id']) === YOUR_WAREHOUSE_ID) {
                // Zoho may return on_hand_quantity on edit
                qty = Number(loc['on_hand_quantity'] ?? loc['initial_stock'] ?? qty);
                break;
              }
            }
          }
          // if stock is zero, delete; otherwise upsert
          if (qty <= 0) {
            await deleteBag(itm);
          } else {
            await upsertBag(itm);
          }

        // On delete → remove bag
        } else if (action === 'deleted') {
          await deleteBag(itm);
        }
      }

    } else if (moduleName === 'itemgroups') {
      // handle groups similarly
      for (const grp of items) {
        if (!isRecord(grp)) continue;
        const compRaw = grp['items'];
        const components = Array.isArray(compRaw) ? compRaw : [];
        for (const itm of components) {
          if (action === 'created' || action === 'edited') {
            // treat group item same as single item: upsert
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
