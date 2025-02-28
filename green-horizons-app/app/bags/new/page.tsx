import { createClient } from '@/utils/supabase/server';
import {
  getCurrentUser,
  getProfileByUserId,
  getEmployeeByProfileId,
  getStrains,
  getHarvestRooms,
  getBagSizeCategories,
} from '@/utils/supabase/queries';
import BagEntryForm from '@/components/bag-entry-form/BagEntryForm';

export default async function BagEntryPage() {
  const supabase = await createClient();

  // Get the current user
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) {
    return <p>User not found. Please sign in.</p>;
  }

  // 1. Get profile data using the currentUser.id
  const profile = await getProfileByUserId(supabase, currentUser.id);
  if (!profile) {
    return <p>Error: Profile not found.</p>;
  }

  // 2. Get employee record for the profile.id
  const employeeRecord = await getEmployeeByProfileId(supabase, profile.id);  // Use profile.id
  if (!employeeRecord) {
    return <p>Error: You are not assigned as an employee.</p>;
  }

  const { id: employeeId, tenant_id: tenantId } = employeeRecord;
  if (!tenantId) {
    return <p>Error: No tenant assigned to this employee.</p>;
  }

  // Fetch required data for bag entry
  const [strains, harvestRooms, bagSizes] = await Promise.all([
    getStrains(supabase),
    getHarvestRooms(supabase),
    getBagSizeCategories(supabase),
  ]);

  return (
    <main className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Create a New Bag Entry</h2>
      <BagEntryForm
        serverStrains={strains || []}
        serverHarvestRooms={harvestRooms || []}
        serverBagSizes={bagSizes || []}
        currentUserId={currentUser.id}  // ✅ Pass the entire user object
        employeeId={employeeId}
        tenantId={tenantId}
      />
    </main>
  );
}
