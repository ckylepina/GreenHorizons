// /app/sales/new/page.tsx (Server Component)
import { createClient } from '@/utils/supabase/server';
import NewSaleScanClient from './NewSaleScanClient';
import {
  getStrains,
  getBagSizeCategories,
  getHarvestRooms,
} from '@/utils/supabase/queries';

export default async function NewSaleScanPage() {
  // Create a server-specific Supabase client (using headers/cookies)
  const supabase = await createClient();

  // Use your query functions to fetch lookup data
  const strains = await getStrains(supabase);
  const bagSizes = await getBagSizeCategories(supabase);
  const harvestRooms = await getHarvestRooms(supabase);

  return (
    <NewSaleScanClient
      initialStrains={strains ?? []}
      initialBagSizes={bagSizes ?? []}
      initialHarvestRooms={harvestRooms ?? []}
    />
  );
}
