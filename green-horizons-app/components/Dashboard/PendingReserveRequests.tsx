'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
}

interface RoleData {
  id: string;
  name: string;
}

export interface RoleRequest {
  id: string;
  status: string;
  created_at: string;
  // Joined employee record with profile details.
  employees: {
    id: string;
    profile: ProfileData;
  };
  // Array of reserved items with joined bag details.
  reserved_request_items: {
    bag_id: string;
    bag: {
      id: string;
      strain_id: string;
      size_category_id: string;
      harvest_room_id: string;
      weight: number;
      current_status: string;
    };
  }[];
}

export interface Tenant {
  id: string;
  name: string;
}

interface PendingReserveRequestsProps {
  requests: RoleRequest[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
}

// Define a type for the grouped reserved bags.
interface ReservedBagGroup {
  count: number;
  totalWeight: number;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
}

// Grouping function: groups reserved items by composite key.
function groupReservedBags(items: { bag_id: string; bag: { 
  id: string;
  strain_id: string;
  size_category_id: string;
  harvest_room_id: string;
  weight: number;
  current_status: string;
} }[]): ReservedBagGroup[] {
  const groups: Record<
    string,
    ReservedBagGroup
  > = {};

  items.forEach((item) => {
    const bag = item.bag;
    const key = `${bag.harvest_room_id || 'unknown'}|${bag.strain_id || 'unknown'}|${bag.size_category_id || 'unknown'}`;
    if (!groups[key]) {
      groups[key] = {
        count: 0,
        totalWeight: 0,
        harvest_room_id: bag.harvest_room_id,
        strain_id: bag.strain_id,
        size_category_id: bag.size_category_id,
      };
    }
    groups[key].count += 1;
    groups[key].totalWeight += bag.weight;
  });

  return Object.values(groups);
}

export default function PendingReserveRequests({
  requests,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
}: PendingReserveRequestsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  async function handleAccept(requestId: string): Promise<void> {
    setLoading(true);
    setError('');
    setSuccess('');
    const { error } = await supabase.rpc('accept_reserve_request', {
      p_request_id: requestId,
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(`Reserve request ${requestId} accepted successfully.`);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleReject(requestId: string): Promise<void> {
    // Implement similar logic for rejecting the request.
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Pending Reserve Requests</h2>
      {loading && <p>Processing...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}
      {requests.length === 0 ? (
        <p>No pending reserve requests.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((req) => {
            // Group the reserved items for this request.
            const groups = groupReservedBags(req.reserved_request_items);
            return (
              <li key={req.id} className="border p-4 rounded">
                <p>
                  <strong>Requested By:</strong>{' '}
                  {req.employees.profile.first_name} {req.employees.profile.last_name}
                </p>
                <p>
                  <strong>Status:</strong> {req.status}
                </p>
                <div className="overflow-x-auto mt-2">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-1">Strain</th>
                        <th className="px-2 py-1">Bag Size</th>
                        <th className="px-2 py-1">Harvest Room</th>
                        <th className="px-2 py-1">Quantity</th>
                        <th className="px-2 py-1">Total Weight (lbs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group, index) => (
                        <tr key={`${req.id}-group-${index}`} className="border-b">
                          <td className="px-2 py-1">
                            {serverStrains.find((s) => s.id === group.strain_id)?.name || 'Unknown'}
                          </td>
                          <td className="px-2 py-1">
                            {serverBagSizes.find((b) => b.id === group.size_category_id)?.name || 'Unknown'}
                          </td>
                          <td className="px-2 py-1">
                            {serverHarvestRooms.find((r) => r.id === group.harvest_room_id)?.name || 'Unknown'}
                          </td>
                          <td className="px-2 py-1">{group.count}</td>
                          <td className="px-2 py-1">{group.totalWeight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                  >
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}