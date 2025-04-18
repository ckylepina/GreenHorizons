// app/api/zoho/webhook/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

interface ZohoItemData {
  sku: string;
  harvest_room_id: string;
  strain_id: string;
  size_category_id: string;
  weight: string;
}

interface ZohoWebhookPayload {
  module: string;
  action: string;
  data: unknown;
}

// Type‐guard for the overall webhook shape
function isZohoWebhookPayload(obj: unknown): obj is ZohoWebhookPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'module' in obj &&
    'action' in obj &&
    'data' in obj
  );
}

// Type‐guard for the `data` portion being an item
function isZohoItemData(obj: unknown): obj is ZohoItemData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as Record<string, unknown>;
  return (
    typeof data.sku === 'string' &&
    typeof data.harvest_room_id === 'string' &&
    typeof data.strain_id === 'string' &&
    typeof data.size_category_id === 'string' &&
    typeof data.weight === 'string'
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing ZOHO_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // 1) Read raw body for signature check
  const rawBody = await request.text();
  const incomingSig = request.headers.get('X-ZOHO-SIGNATURE') ?? '';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
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

  if (!isZohoWebhookPayload(parsed)) {
    console.error('Unexpected webhook shape', parsed);
    return NextResponse.json({ error: 'Unexpected payload' }, { status: 400 });
  }

  const { module, action, data } = parsed;
  console.log('📬 Zoho webhook received:', { module, action, data });

  const supabase = await createClient();

  // 3) Only handle Items module
  if (module === 'items') {
    if (!isZohoItemData(data)) {
      console.error('Invalid item data', data);
      return NextResponse.json({ error: 'Invalid item data' }, { status: 400 });
    }

    const { sku, harvest_room_id, strain_id, size_category_id, weight } = data;
    const weightNum = parseFloat(weight);
    const now = new Date().toISOString();

    if (action === 'created' || action === 'edited') {
      const { error: upsertError } = await supabase
        .from('bags')
        .upsert({
          qr_code:        sku,
          harvest_room_id,
          strain_id,
          size_category_id,
          weight:         weightNum,
          current_status: 'in_inventory',
          updated_at:     now,
          created_at:     now,
        });
      if (upsertError) {
        console.error('Error upserting bag:', upsertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      console.log('✅ Bag upserted:', sku);
    } else if (action === 'deleted') {
      const { error: deleteError } = await supabase
        .from('bags')
        .delete()
        .eq('qr_code', sku);
      if (deleteError) {
        console.error('Error deleting bag:', deleteError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      console.log('🗑️ Bag deleted:', sku);
    } else {
      console.warn('Unhandled item action:', action);
    }
  } else {
    console.warn('Unhandled module:', module);
  }

  // 4) Return OK
  return NextResponse.json({ status: 'ok' });
}