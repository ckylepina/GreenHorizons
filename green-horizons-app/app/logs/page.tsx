// app/logs/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect }      from 'next/navigation';
import {
  getCurrentUser,
  getProfileByUserId,
  getProfileEmployeeRecord,
} from '@/utils/supabase/queries';
import type { Profile, Employee } from '@/app/types/dashboard';

type BagLogItem = {
  id: string;
  qr_code: string;
  current_status: 'in_inventory' | 'reserved' | 'out_for_delivery' | 'sold' | 'returned' | 'missing';
  reserved_for:       string | null;
  delivery_person:    string | null;
  delivery_recipient: string | null;
  updated_at:         string;
  harvest_room: { name: string }[];
  strain:       { name: string }[];
  size:         { name: string }[];
};

export default async function LogsPage() {
  const supabase = await createClient();

  // 1) Require login, fetch user and profile
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }
  const profile: Profile | null = await getProfileByUserId(supabase, rawUser.id);
  if (!profile) {
    redirect('/sign-in');
    return null;
  }

  // 2) Fetch employee record to enforce role if needed
  const employee: Employee | null = await getProfileEmployeeRecord(supabase, profile.id);
  if (!employee) {
    redirect('/request-role');
    return null;
  }

  // 3) Fetch all bag logs
  let logs: BagLogItem[] = [];
  try {
    const { data, error } = await supabase
      .from<'bags', BagLogItem>('bags')
      .select(`
        id,
        qr_code,
        current_status,
        reserved_for,
        delivery_person,
        delivery_recipient,
        updated_at,
        harvest_room:harvest_rooms(name),
        strain:strains(name),
        size:bag_size_categories(name)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading bag logs:', error);
    } else if (data) {
      logs = data;
    }
  } catch (err) {
    console.error('Unexpected error fetching bag logs:', err);
  }

  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        Bag Activity Log — {employee.role_name}
      </h1>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        Logged in as {profile.first_name} {profile.last_name} ({profile.email})
      </p>

      {logs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 border">QR Code</th>
                <th className="px-3 py-2 border">Status</th>
                <th className="px-3 py-2 border">Reserved For</th>
                <th className="px-3 py-2 border">Delivered By</th>
                <th className="px-3 py-2 border">Delivered To</th>
                <th className="px-3 py-2 border">Room</th>
                <th className="px-3 py-2 border">Strain</th>
                <th className="px-3 py-2 border">Size</th>
                <th className="px-3 py-2 border">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-3 py-2 border">{log.qr_code}</td>
                  <td className="px-3 py-2 border">
                    {log.current_status.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 border">{log.reserved_for ?? '—'}</td>
                  <td className="px-3 py-2 border">{log.delivery_person ?? '—'}</td>
                  <td className="px-3 py-2 border">{log.delivery_recipient ?? '—'}</td>
                  <td className="px-3 py-2 border">
                    {log.harvest_room[0]?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 border">
                    {log.strain[0]?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 border">
                    {log.size[0]?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 border">
                    {new Date(log.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No activity logged yet.</p>
      )}
    </main>
  );
}
