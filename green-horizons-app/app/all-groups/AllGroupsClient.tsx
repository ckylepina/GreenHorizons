'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { SupabaseClient }      from '@supabase/supabase-js';
import { getAllGroups }             from '@/utils/supabase/queries';
import type { BagGroupSummary }     from '@/app/types/dashboard';

interface Props {
  supabase: SupabaseClient;
}

export default function AllGroupsClient({ supabase }: Props) {
  const params  = useSearchParams();
  const page    = parseInt(params.get('page') ?? '1', 10);
  const perPage = 20;

  const [groups, setGroups] = useState<BagGroupSummary[]>([]);
  const [count,  setCount]  = useState<number>(0);

  useEffect(() => {
    getAllGroups(supabase, page, perPage).then(({ data, count }) => {
      if (data) setGroups(data);
      if (typeof count === 'number') setCount(count);
    });
  }, [page, supabase]);

  const totalPages = Math.ceil(count / perPage);

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Bag Groups</h1>

      {groups.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No groups found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white dark:bg-gray-800 rounded shadow">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-3 py-2 border">Group ID</th>
                <th className="px-3 py-2 border">Room ID</th>
                <th className="px-3 py-2 border">Strain ID</th>
                <th className="px-3 py-2 border">Size ID</th>
                <th className="px-3 py-2 border">Count</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.group_id}
                  className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-3 py-1">{g.group_id}</td>
                  <td className="px-3 py-1">{g.harvest_room_id}</td>
                  <td className="px-3 py-1">{g.strain_id}</td>
                  <td className="px-3 py-1">{g.size_category_id}</td>
                  <td className="px-3 py-1 text-center">{g.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      <div className="mt-6 flex justify-center space-x-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <a
            key={p}
            href={`?page=${p}`}
            className={`px-3 py-1 border rounded ${
              p === page
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {p}
          </a>
        ))}
      </div>
    </main>
  );
}
