// app/seller-dashboard/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { 
  getCurrentUser, 
  getProfileEmployeeRecord 
  // Optionally, if you'll use these later, uncomment the next two lines.
  // , getReserveRequests, 
  // getReservedInventory 
} from '@/utils/supabase/queries';
import SellerDashboard from '@/components/Dashboard/SellerDashboard';

export default async function SellerDashboardPage() {
  const supabase = await createClient();

  // 1. Get the current user.
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Normalize the user object so that email is never undefined.
  const user = {
    id: rawUser.id,
    email: rawUser.email ?? null,
  };

  // 2. Get the employee record.
  const employee = await getProfileEmployeeRecord(supabase, user.id);
  if (!employee) {
    redirect('/no-access');
    return null;
  }

  // 3. Verify that the role is seller.
  if (employee.role_name !== 'seller') {
    redirect('/');
    return null;
  }

  // Optionally, if you plan to use reserveRequests and reservedInventory later, uncomment the block below.
  /*
  let reserveRequests = [];
  let reservedInventory = [];
  try {
    reserveRequests = await getReserveRequests(supabase, employee.id);
    reservedInventory = await getReservedInventory(supabase, employee.id);
  } catch (error) {
    console.error('Error fetching seller dashboard data:', error);
  }
  */

  return (
    <SellerDashboard
      user={user}
      // If you decide to use them later, include these props:
      // reserveRequests={reserveRequests}
      // reservedInventory={reservedInventory}
    />
  );
}