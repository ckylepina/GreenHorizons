// app/deliveries/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect }      from 'next/navigation';
import { getCurrentUser } from '@/utils/supabase/queries';

type DeliveryBag = {
  id: string;
  qr_code: string;
  delivery_person: string | null;
  delivery_recipient: string | null;
  updated_at: string;
  weight: number;
  harvest_room: { name: string }[];
  strain:       { name: string }[];
  size:         { name: string }[];
};

export default async function DeliveriesPage() {
  const supabase = await createClient();

  // 1) Require login
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // 2) Fetch out-for-delivery bags
  let deliveryBags: DeliveryBag[] = [];
  try {
    const { data, error } = await supabase
      .from<'bags', DeliveryBag>('bags')
      .select(`
        id,
        qr_code,
        delivery_person,
        delivery_recipient,
        updated_at,
        weight,
        harvest_room:harvest_rooms(name),
        strain:strains(name),
        size:bag_size_categories(name)
      `)
      .eq('current_status', 'out_for_delivery')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading deliveries:', error);
    } else if (data) {
      deliveryBags = data;
    }
  } catch (err) {
    console.error('Unexpected error fetching deliveries:', err);
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Out for Delivery</h1>

      {deliveryBags.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 border">QR Code</th>
                <th className="px-3 py-2 border">Delivered By</th>
                <th className="px-3 py-2 border">Delivered To</th>
                <th className="px-3 py-2 border">Room</th>
                <th className="px-3 py-2 border">Strain</th>
                <th className="px-3 py-2 border">Size</th>
                <th className="px-3 py-2 border">Weight</th>
                <th className="px-3 py-2 border">Dispatched At</th>
                <th className="px-3 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveryBags.map(bag => (
                <tr
                  key={bag.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-3 py-2 border">{bag.qr_code}</td>
                  <td className="px-3 py-2 border">{bag.delivery_person ?? '—'}</td>
                  <td className="px-3 py-2 border">{bag.delivery_recipient ?? '—'}</td>
                  <td className="px-3 py-2 border">
                    {bag.harvest_room[0]?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 border">
                    {bag.strain[0]?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 border">
                    {bag.size[0]?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 border">{bag.weight}</td>
                  <td className="px-3 py-2 border">
                    {new Date(bag.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 border space-x-2">
                    <button
                      className="px-2 py-1 text-green-600 hover:underline"
                      // TODO: wire up “Mark Sold” action
                    >
                      Mark Sold
                    </button>
                    <button
                      className="px-2 py-1 text-red-600 hover:underline"
                      // TODO: wire up “Mark Returned” action
                    >
                      Mark Returned
                    </button>
                    <button
                      className="px-2 py-1 text-blue-600 hover:underline"
                      // TODO: edit delivery details
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No deliveries in progress.</p>
      )}
    </main>
  );
}
