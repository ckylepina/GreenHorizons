import { createClient } from '@/utils/supabase/server';
import NewSaleScanClient from './NewSaleScanClient';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getProfileByUserId,
  getProfileEmployeeRecord,
  getStrains,
  getBagSizeCategories,
  getHarvestRooms,
  getTenantByProfileId,
} from '@/utils/supabase/queries';

export default async function NewSaleScanPage() {
  const supabase = await createClient();

  // 1. Get the current user.
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // 2. Get the profile data using rawUser.id.
  const profile = await getProfileByUserId(supabase, rawUser.id);
  if (!profile) {
    redirect('/sign-in');
    return null;
  }

  // 3. Get the employee record using profile.id.
  const employee = await getProfileEmployeeRecord(supabase, profile.id);
  if (!employee) {
    redirect('/request-role');
    return null;
  }

  // 4. Get the tenant id using the profile id.
  const tenantId = await getTenantByProfileId(supabase, profile.id);

  // 5. Fetch lookup data.
  const strains = await getStrains(supabase);
  const bagSizes = await getBagSizeCategories(supabase);
  const harvestRooms = await getHarvestRooms(supabase);

  return (
    <NewSaleScanClient
      initialStrains={strains ?? []}
      initialBagSizes={bagSizes ?? []}
      initialHarvestRooms={harvestRooms ?? []}
      currentEmployeeId={employee.id} // from employee record
      tenantId={tenantId}             // tenant id obtained using profile.id
    />
  );
}