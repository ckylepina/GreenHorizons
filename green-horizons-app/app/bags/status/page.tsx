// app/bags/status/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getStrains,
  getBagSizeCategories,
  getHarvestRooms,
} from '@/utils/supabase/queries';
import ReserveBagScanClient from '@/components/ReserveBagScan/ReserveBagScanClient';

export default async function ReserveBagsPage() {
  const supabase = await createClient();

  // Require login
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Fetch lookups for the scanner
  const [strains, bagSizes, harvestRooms] = await Promise.all([
    getStrains(supabase),
    getBagSizeCategories(supabase),
    getHarvestRooms(supabase),
  ]);

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Reserve / Dispatch Bags</h1>
      <ReserveBagScanClient
        initialStrains={strains  ?? []}
        initialBagSizes={bagSizes  ?? []}
        initialHarvestRooms={harvestRooms ?? []}
      />
    </main>
  );
}
