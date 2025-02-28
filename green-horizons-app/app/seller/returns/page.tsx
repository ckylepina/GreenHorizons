// app/seller/returns/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentUser, getCurrentInventory } from '@/utils/supabase/queries';
import ReturnsDashboardComponent from '@/components/Dashboard/ReturnsDashboardComponent';

export default async function ReturnsPage() {
  const supabase = await createClient();

  // Fetch the current user
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Normalize the user so that email is always a string.
  const user = {
    email: rawUser.email ?? '',
  };

  // Fetch inventory if needed to validate a return.
  let inventoryBags = [];
  try {
    inventoryBags = await getCurrentInventory(supabase);
  } catch (error) {
    console.error('Error fetching inventory:', error);
  }

  return (
    <ReturnsDashboardComponent user={user} inventoryBags={inventoryBags} />
  );
}