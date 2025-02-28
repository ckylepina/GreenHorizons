// app/employee-dashboard/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, getProfileEmployeeRecord, getMyBags, getBags } from '@/utils/supabase/queries';
import EmployeeDashboardComponent from '@/components/Dashboard/InventoryManagementDashboardComponent';

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();

  // Fetch the current user.
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Normalize the user so that email is never undefined.
  const user = {
    id: rawUser.id,
    email: rawUser.email ?? null,
  };

  // Fetch the employee record and verify the role is "inventory_management".
  const employee = await getProfileEmployeeRecord(supabase, user.id);
  if (!employee || employee.role_name !== 'inventory_management') {
    redirect('/');
    return null;
  }

  // Fetch the bags that the employee bagged (for today or a given time period).
  const myBags = await getMyBags(supabase, employee.id);

  // Fetch current inventory: all bags with current_status equal to "in_inventory".
  const inventoryBags = await getBags(supabase, { status: 'in_inventory' });

  return (
    <EmployeeDashboardComponent
      user={user}
      myBags={myBags}
      inventoryBags={inventoryBags}
    />
  );
}
