import RecentBagGroupsPanel from '@/components/Dashboard/RecentBagGroupsPanel';
import { createClient }               from '@/utils/supabase/server';
import {
  getAllGroups,
  getStrains,
  getBagSizeCategories,
  getHarvestRooms,
} from '@/utils/supabase/queries';
import type { BagGroupSummary }        from '@/app/types/dashboard';

export default async function AllGroupsPage() {
  const supabase = await createClient();

  // server‐side: fetch first page of group summaries
  const { data: groups = [], count } = await getAllGroups(supabase, 1, 20);

  // parallel lookups
  const [serverStrains, serverBagSizes, serverHarvestRooms] =
    await Promise.all([
      getStrains(supabase),
      getBagSizeCategories(supabase),
      getHarvestRooms(supabase),
    ]);

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Bag Groups</h1>

      <RecentBagGroupsPanel
        groups={groups as BagGroupSummary[]}
        serverStrains={serverStrains}
        serverBagSizes={serverBagSizes}
        serverHarvestRooms={serverHarvestRooms}
        viewAllHref="/all-groups?page=1"
      />

      {/* TODO: render pagination controls below */}
      <p className="mt-4 text-center text-sm text-gray-500">
        Page 1 of {Math.ceil((count ?? 0) / 20)}
      </p>
    </main>
  );
}