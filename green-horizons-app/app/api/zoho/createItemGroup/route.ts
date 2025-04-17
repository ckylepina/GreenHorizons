// app/api/zoho/createItemGroup/route.ts
import { NextResponse } from 'next/server';
import { refreshZohoAccessToken } from '@/app/lib/zohoAuth';

export async function POST(request: Request) {
  const { items } = await request.json();
  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
  }

  const organizationId = process.env.ZOHO_ORGANIZATION_ID;
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID not configured' }, { status: 500 });
  }

  // Get a fresh access token
  const accessToken = await refreshZohoAccessToken();

  const bodyPayload = {
    group_name: "Bags",
    brand: "Brand",
    manufacturer: "Bagstore",
    unit: "qty",
    description: "Group for Bags created from our system",
    tax_id: 4815000000044043,
    attribute_name1: "Small",
    items: items,
    attributes: [
      {
        id: 4815000000044112,
        name: "Bags-small",
        options: [
          {
            id: 4815000000044112,
            name: "Bags-small"
          }
        ]
      }
    ]
  };

  const apiUrl = `https://www.zohoapis.com/inventory/v1/itemgroups?organization_id=${organizationId}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  });

  const result = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: result }, { status: response.status });
  }
  return NextResponse.json(result);
}