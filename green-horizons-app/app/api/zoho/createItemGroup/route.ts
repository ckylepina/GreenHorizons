// app/api/zoho/createItemGroup/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

interface CustomField {
  customfield_id: string;
  value: string;
}

export interface ZohoItemPayload {
  name: string;
  sku: string;
  rate: number;
  purchase_rate: number;
  attribute_option_name1: string;
  custom_fields: CustomField[];
}

interface CreateItemGroupRequest {
  items: ZohoItemPayload[];
}

/** Type guard for CreateItemGroupRequest */
function isCreateItemGroupRequest(
  obj: unknown
): obj is CreateItemGroupRequest {
  if (
    typeof obj !== 'object' ||
    obj === null ||
    !('items' in obj)
  ) {
    return false;
  }
  const maybe = obj as Record<string, unknown>;
  if (!Array.isArray(maybe.items)) {
    return false;
  }
  // We could check each array element more deeply here if desired
  return true;
}

export async function POST(request: NextRequest) {
  // 1) Parse and validate JSON
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  if (!isCreateItemGroupRequest(payload)) {
    return NextResponse.json(
      { error: 'Missing or invalid "items" array' },
      { status: 400 }
    );
  }
  const { items } = payload;

  // 2) Load organization ID and refresh token
  const orgId = process.env.ZOHO_ORGANIZATION_ID;
  if (!orgId) {
    return NextResponse.json(
      { error: 'Zoho organization ID not configured' },
      { status: 500 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await refreshZohoAccessToken();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown auth error';
    console.error('Error refreshing Zoho token:', message);
    return NextResponse.json(
      { error: 'Failed to refresh access token' },
      { status: 500 }
    );
  }

  // 3) Build and send the request to Zoho
  const bodyPayload = {
    group_name: 'Bags',
    unit: 'qty',
    items, // array of ZohoItemPayload
  };

  let zohoResponse: Response;
  let zohoResult: Record<string, unknown>;
  try {
    zohoResponse = await fetch(
      `https://www.zohoapis.com/inventory/v1/itemgroups?organization_id=${orgId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      }
    );
    zohoResult = (await zohoResponse.json()) as Record<string, unknown>;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown fetch error';
    console.error('Fetch error calling Zoho:', message);
    return NextResponse.json(
      { error: 'Network error when calling Zoho API' },
      { status: 502 }
    );
  }

  // 4) Handle Zoho response
  if (!zohoResponse.ok) {
    console.error('Zoho API error response:', zohoResult);
    return NextResponse.json(
      { error: zohoResult },
      { status: zohoResponse.status }
    );
  }

  // 5) Success
  return NextResponse.json(zohoResult);
}