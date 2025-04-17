// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

interface ZohoWebhookPayload {
  module: string;
  action: string;
  data: Record<string, string | number>;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const incomingSig = request.headers.get('X-ZOHO-SIGNATURE') ?? '';
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('🚨 Missing ZOHO_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  if (incomingSig !== expectedSig) {
    console.error('🔒 Invalid signature', { incomingSig, expectedSig });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (err) {
    console.error('❌ JSON parse error', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Narrow to expected shape
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('module' in parsed) ||
    !('action' in parsed) ||
    !('data' in parsed)
  ) {
    console.error('❌ Unexpected payload shape', parsed);
    return NextResponse.json({ error: 'Unexpected payload' }, { status: 400 });
  }
  const { module, action, data } = parsed as ZohoWebhookPayload;

  console.log('📬 Zoho webhook received:', { module, action, data });

  const supabase = await createClient();

  try {
    if (module === 'items' && (action === 'created' || action === 'updated')) {
      // Extract and cast fields
      const sku = String(data.sku);
      const harvestRoomId = String(data.harvest_room_id);
      const strainId = String(data.strain_id);
      const sizeCategoryId = String(data.size_category_id);
      const weight = Number(data.weight);
      const now = new Date().toISOString();

      // Upsert into bags
      await supabase.from('bags').upsert({
        qr_code: sku,
        harvest_room_id: harvestRoomId,
        strain_id: strainId,
        size_category_id: sizeCategoryId,
        weight,
        current_status: 'in_inventory',
        updated_at: now,
        created_at: now
      });
    } else if (module === 'inventory_adjustments' && action === 'created') {
      const adjustmentId = String(data.adjustment_id);
      const itemId = String(data.item_id);
      const quantity = Number(data.quantity_adjusted);
      const reason = String(data.reason);
      const now = new Date().toISOString();

      await supabase.from('inventory_adjustments').insert({
        id: adjustmentId,
        item_id: itemId,
        quantity,
        reason,
        created_at: now
      });
    } else {
      console.warn('⚠️ Unhandled Zoho module or action:', module, action);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('🔥 Webhook handler error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}