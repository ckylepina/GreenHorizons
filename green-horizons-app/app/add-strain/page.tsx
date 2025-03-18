// /app/quick-actions/add-strain/page.tsx (Server Component)
import { createClient } from '@/utils/supabase/server';
import { getHarvestRooms, getCurrentUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import AddStrainForm from '@/components/AddStrainForm';

export default async function AddStrainPage() {
  const supabase = await createClient();

  // Check if the user is logged in
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  const harvestRooms = await getHarvestRooms(supabase);

  // Compute the next available harvest room name.
  let newHarvestRoomName = 'H1';
  if (harvestRooms && harvestRooms.length > 0) {
    const highestRoom = harvestRooms.reduce((prev, current) => {
      const numPrev = parseInt(prev.name.replace(/[^\d]/g, ''), 10) || 0;
      const numCurrent = parseInt(current.name.replace(/[^\d]/g, ''), 10) || 0;
      return numCurrent > numPrev ? current : prev;
    });
    const highestNum = parseInt(highestRoom.name.replace(/[^\d]/g, ''), 10) || 0;
    newHarvestRoomName = `H${highestNum + 1}`;
  }

  return (
    <div className="p-4">
      <AddStrainForm
        harvestRooms={harvestRooms}
        newHarvestRoomName={newHarvestRoomName}
      />
    </div>
  );
}