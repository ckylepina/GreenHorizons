// app/api/roles/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('roles')
    .select('id, name')
    .neq('name', 'super_admin'); // Exclude roles you don't want users to request

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
