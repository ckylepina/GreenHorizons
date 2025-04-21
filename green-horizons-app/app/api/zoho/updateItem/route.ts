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
  // 1) Parse & validate JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 })
  }
  const { sku, name, cf_harvest, cf_size, rate, purchase_rate } =
    body as UpdateItemBody
  if (!sku || typeof sku !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sku' }, { status: 400 })
  }

  // 2) Get org ID & access token
  const orgId = process.env.ZOHO_ORGANIZATION_ID
  if (!orgId) {
    return NextResponse.json({ error: 'Org ID not configured' }, { status: 500 })
  }
  let token: string
  try {
    token = await refreshZohoAccessToken()
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }

  // 3) Build minimal payload with only the fields you actually passed
  const payload: Record<string, unknown> = {}
  if (name)           payload.name           = name
  if (typeof rate === 'number')         payload.rate           = rate
  if (typeof purchase_rate === 'number') payload.purchase_rate  = purchase_rate

  const customFields: Array<{ customfield_id: string; value: string }> = []
  if (cf_harvest) customFields.push({
    customfield_id: '6118005000000123236',
    value: cf_harvest
  })
  if (cf_size)    customFields.push({
    customfield_id: '6118005000000280001',
    value: cf_size
  })
  if (customFields.length) payload.custom_fields = customFields

  console.log('[Server] updateItem payload →', JSON.stringify(payload, null, 2))

  // 4) Call Zoho’s PUT endpoint
  const url = `https://www.zohoapis.com/inventory/v1/items/${encodeURIComponent(
    sku
  )}?organization_id=${orgId}`
  let resp: Response
  try {
    resp = await fetch(url, {
      method:  'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch (networkErr) {
    console.error('Network error calling Zoho:', networkErr)
    return NextResponse.json({ error: 'Network error' }, { status: 502 })
  }

  // 5) Parse Zoho’s response (or raw text on parse failure)
  let zohoBody: unknown
  try {
    zohoBody = await resp.json()
  } catch (parseErr) {
    const raw = await resp.text()
    console.error('Failed to parse Zoho response as JSON:', parseErr, raw)
    zohoBody = { raw }
  }

  // 6) If Zoho returns an error status, log & forward it
  if (!resp.ok) {
    console.error('Zoho update error:', resp.status, zohoBody)
    return NextResponse.json(zohoBody, { status: resp.status })
  }

  // 7) Success!
  console.log('✅ Zoho item updated:', sku, zohoBody)
  return NextResponse.json(zohoBody)
}