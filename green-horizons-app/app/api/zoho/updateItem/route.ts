// app/api/zoho/updateItem/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth'

interface UpdateItemBody {
  sku: string
  name?: string
  cf_harvest?: string
  cf_size?: string
  rate?: number
  purchase_rate?: number
}

export async function POST(request: NextRequest) {
  // 1) Parse + validate incoming JSON
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof rawBody !== 'object' || rawBody === null) {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 })
  }
  const body = rawBody as Partial<UpdateItemBody>
  const { sku, name, cf_harvest, cf_size, rate, purchase_rate } = body

  if (!sku || typeof sku !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 })
  }

  // 2) Load orgId + refresh token
  const orgId = process.env.ZOHO_ORGANIZATION_ID
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 })
  }
  let token: string
  try {
    token = await refreshZohoAccessToken()
  } catch (err) {
    console.error('Auth failed:', err)
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  }

  // 3) LOOKUP ITEM_ID BY SKU
  const lookupUrl = `https://www.zohoapis.com/inventory/v1/items?organization_id=${orgId}&sku=${encodeURIComponent(sku)}`
  console.log('[Server] LOOKUP → GET', lookupUrl)
  let lookupRes: Response
  try {
    lookupRes = await fetch(lookupUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    })
  } catch (networkErr) {
    console.error('Network error during lookup:', networkErr)
    return NextResponse.json({ error: 'Lookup network error' }, { status: 502 })
  }

  let lookupJson: unknown
  try {
    lookupJson = await lookupRes.json()
  } catch {
    console.error('Lookup JSON parse error')
    return NextResponse.json({ error: 'Lookup parse error' }, { status: 502 })
  }

  // Validate shape: { items: Array<{ item_id: string }> }
  if (
    !lookupRes.ok ||
    typeof lookupJson !== 'object' ||
    lookupJson === null ||
    !('items' in lookupJson) ||
    !Array.isArray((lookupJson as Record<string, unknown>).items) ||
    ((lookupJson as Record<string, unknown>).items as unknown[]).length === 0
  ) {
    console.error('Lookup failed or no items:', lookupRes.status, lookupJson)
    return NextResponse.json(
      { error: 'Item not found in Zoho', details: lookupJson },
      { status: lookupRes.status || 404 }
    )
  }
  const itemsArray = (lookupJson as Record<string, unknown>).items as unknown[]
  const first = itemsArray[0]
  if (
    typeof first !== 'object' ||
    first === null ||
    !('item_id' in first) ||
    typeof (first as Record<string, unknown>).item_id !== 'string'
  ) {
    console.error('Unexpected lookup item shape:', first)
    return NextResponse.json({ error: 'Lookup returned bad data' }, { status: 502 })
  }
  const itemId = (first as Record<string, unknown>).item_id as string
  console.log('[Server] Found item_id=', itemId)

  // 4) Build update payload with only provided fields
  const updatePayload: Record<string, unknown> = {}
  if (typeof name === 'string')   updatePayload.name           = name
  if (typeof rate === 'number')    updatePayload.rate           = rate
  if (typeof purchase_rate === 'number') updatePayload.purchase_rate = purchase_rate

  const customFields: { customfield_id: string; value: string }[] = []
  if (typeof cf_harvest === 'string') customFields.push({ customfield_id: '6118005000000123236', value: cf_harvest })
  if (typeof cf_size === 'string')    customFields.push({ customfield_id: '6118005000000280001', value: cf_size })
  if (customFields.length > 0)       updatePayload.custom_fields = customFields

  console.log(
    `[Server] UPDATE → PUT https://www.zohoapis.com/inventory/v1/items/${itemId}?organization_id=${orgId}`
  )
  console.log('[Server] updatePayload:', JSON.stringify(updatePayload, null, 2))

  // 5) Send the PUT
  let updateRes: Response
  try {
    updateRes = await fetch(
      `https://www.zohoapis.com/inventory/v1/items/${itemId}?organization_id=${orgId}`,
      {
        method:  'PUT',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      }
    )
  } catch (networkErr) {
    console.error('Network error during update:', networkErr)
    return NextResponse.json({ error: 'Update network error' }, { status: 502 })
  }

  let updateJson: unknown
  try {
    updateJson = await updateRes.json()
  } catch {
    const text = await updateRes.text()
    console.error('Update parse error, raw text:', text)
    updateJson = { raw: text }
  }

  if (!updateRes.ok) {
    console.error('Zoho update failed:', updateRes.status, updateJson)
    return NextResponse.json(updateJson, { status: updateRes.status })
  }

  console.log('✅ Zoho update success:', updateJson)
  return NextResponse.json(updateJson)
}