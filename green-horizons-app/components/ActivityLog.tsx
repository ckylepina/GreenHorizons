'use client';

import React from 'react';

export interface ActivityEntry {
  id:         string;
  bag_id:     string;
  old_status: string;
  new_status: string;
  changed_at: string;
  changed_by: string;
}

interface ActivityLogTableProps {
  data: ActivityEntry[];
}

export default function ActivityLogTable({ data }: ActivityLogTableProps) {
  return (
    <div className="overflow-x-auto">
      {data.length > 0 ? (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-3 py-2 border text-left">Bag ID</th>
              <th className="px-3 py-2 border text-left">From</th>
              <th className="px-3 py-2 border text-left">To</th>
              <th className="px-3 py-2 border text-left">Changed At</th>
              <th className="px-3 py-2 border text-left">By</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-3 py-2 border">{entry.bag_id}</td>
                <td className="px-3 py-2 border">{entry.old_status}</td>
                <td className="px-3 py-2 border">{entry.new_status}</td>
                <td className="px-3 py-2 border">
                  {new Date(entry.changed_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 border">{entry.changed_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="p-4 text-center text-gray-500 dark:text-gray-400">
          No activity to display.
        </p>
      )}
    </div>
  );
}