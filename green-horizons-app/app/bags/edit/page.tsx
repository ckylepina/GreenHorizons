import { createClient } from '@/utils/supabase/server';
import EditBagScanClient from './EditBagScanClient';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getStrains,
  getBagSizeCategories,
  getHarvestRooms
} from '@/utils/supabase/queries';

export default async function EditBagsPage() {
  const supabase = await createClient();

  // Check if the user is logged in.
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Fetch lookup data
  const strains = await getStrains(supabase);
  const bagSizes = await getBagSizeCategories(supabase);
  const harvestRooms = await getHarvestRooms(supabase);

  return (
    <EditBagScanClient
      initialStrains={strains ?? []}
      initialBagSizes={bagSizes ?? []}
      initialHarvestRooms={harvestRooms ?? []}
    />
  );
}