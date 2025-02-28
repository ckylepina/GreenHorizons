// app/seller/sales/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, getCurrentInventory } from '@/utils/supabase/queries';
import SalesDashboardComponent from '@/components/Dashboard/SalesDashboardComponent';

export default async function SellerSalesPage() {
  const supabase = await createClient();

  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Normalize the user so that email is always a string.
  const user = {
    id: rawUser.id,
    email: rawUser.email ?? '',
  };

  // Fetch current inventory (bags with current_status "in_inventory")
  let inventoryBags = [];
  try {
    inventoryBags = await getCurrentInventory(supabase);
  } catch (error) {
    console.error('Error fetching inventory:', error);
  }

  return (
    <SalesDashboardComponent user={user} inventoryBags={inventoryBags} />
  );
}