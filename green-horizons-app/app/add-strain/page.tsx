// /app/quick-actions/add-strain/page.tsx (server component)
import { createClient } from '@/utils/supabase/server';
import { getHarvestRooms } from '@/utils/supabase/queries';
import AddStrainForm from '@/components/AddStrainForm';

export default async function AddStrainPage() {
  const supabase = await createClient();
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