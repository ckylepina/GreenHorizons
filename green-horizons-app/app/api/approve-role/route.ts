// app/api/approve-role/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate the admin making the request
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    // If there's an auth error or no user, return 401
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the admin's role
    const { data: adminEmployee, error: adminError } = await supabase
      .from('employees')
      // Because "roles" often returns an array by default
      .select('roles!inner(name)')
      .eq('user_id', user.id)
      .single();

    // If roles is an array, get the first element’s name
    const adminRole = adminEmployee?.roles?.[0]?.name;

    if (
      adminError ||
      !adminEmployee ||
      !adminEmployee.roles ||
      !adminEmployee.roles[0] ||
      !['admin', 'super_admin'].includes(adminRole)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the request body
    const { requestId, approve } = await req.json();

    if (!requestId || typeof approve !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Fetch the role request
    const { data: roleRequest, error: requestError } = await supabase
      .from('role_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !roleRequest) {
      return NextResponse.json({ error: 'Role request not found' }, { status: 404 });
    }

    if (roleRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Role request is already processed' },
        { status: 400 }
      );
    }

    // Update the role_requests table
    const { error: updateError } = await supabase
      .from('role_requests')
      .update({ status: approve ? 'approved' : 'denied', updated_at: new Date() })
      .eq('id', requestId);

    if (updateError) {
      throw updateError;
    }

    if (approve) {
      // Update the employee's role
      const { error: employeeUpdateError } = await supabase
        .from('employees')
        .update({ role_id: roleRequest.desired_role_id, updated_at: new Date() })
        .eq('user_id', roleRequest.user_id);

      if (employeeUpdateError) {
        throw employeeUpdateError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }
}
