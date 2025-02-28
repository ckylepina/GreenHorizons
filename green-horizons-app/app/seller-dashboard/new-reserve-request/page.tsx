// app/seller-dashboard/new-reserve-request/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { createClient } from '@/utils/supabase/client';
import {
  getCurrentInventory,
  getHarvestRooms,
  getStrains,
  getBagSizeCategories,
  getCurrentUser,
  getProfileByUserId,
  getEmployeeByProfileId
} from '@/utils/supabase/queries';
import GroupedInventoryReseveRequest from '@/components/Dashboard/GroupInventoryReserveRequest';
import FilterControls from '@/components/Inventory/FilterControls';

export default function NewReserveRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  // State for employee id (used as seller id)
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  // State for pending bag IDs from existing pending requests
  const [pendingBagIds, setPendingBagIds] = useState<Set<string>>(new Set());

  // Inventory & lookup data.
  const [inventory, setInventory] = useState<BagRecord[]>([]);
  const [serverStrains, setServerStrains] = useState<Strain[]>([]);
  const [serverBagSizes, setServerBagSizes] = useState<BagSize[]>([]);
  const [serverHarvestRooms, setServerHarvestRooms] = useState<HarvestRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filter controls state.
  const [selectedHarvestRoom, setSelectedHarvestRoom] = useState<string>('');
  const [selectedStrain, setSelectedStrain] = useState<string>('');
  const [selectedBagSize, setSelectedBagSize] = useState<string>('');
  const [filterToday, setFilterToday] = useState<boolean>(false);

  // Fetch employeeId using user, profile, employee queries.
  const fetchEmployeeId = useCallback(async () => {
    try {
      const user = await getCurrentUser(supabase);
      if (!user) {
        router.push('/sign-in');
        return;
      }
      const profile = await getProfileByUserId(supabase, user.id);
      if (!profile) {
        router.push('/sign-in');
        return;
      }
      const employee = await getEmployeeByProfileId(supabase, profile.id);
      if (!employee) {
        router.push('/request-role');
        return;
      }
      setEmployeeId(employee.id);
    } catch (error) {
      console.error('Error fetching employee id:', error);
      setError('Error fetching employee information.');
    }
  }, [supabase, router]);

  // Fetch inventory and lookup data.
  const fetchInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const invData = await getCurrentInventory(supabase);
      setInventory(invData as BagRecord[]);

      const strains = await getStrains(supabase);
      setServerStrains(strains as Strain[]);

      const bagSizes = await getBagSizeCategories(supabase);
      setServerBagSizes(bagSizes as BagSize[]);

      const harvestRooms = await getHarvestRooms(supabase);
      setServerHarvestRooms(harvestRooms as HarvestRoom[]);
    } catch (err) {
      console.error(err);
      setError('Error fetching inventory data.');
    }
    setLoading(false);
  }, [supabase]);

  // Fetch pending bag IDs from the seller's pending reserve requests.
  const fetchPendingBagIds = useCallback(async () => {
    if (!employeeId) return;
    try {
      const { data, error } = await supabase
        .from('reserved_requests')
        .select(`reserved_request_items(bag_id)`)
        .eq('employee_id', employeeId)
        .eq('status', 'pending');
      if (error) {
        console.error('Error fetching pending bag ids:', error);
        return;
      }
      const ids = new Set<string>();
      data?.forEach((req: any) => {
        req.reserved_request_items?.forEach((item: any) => {
          if (item.bag_id) ids.add(item.bag_id);
        });
      });
      setPendingBagIds(ids);
    } catch (err) {
      console.error('Error fetching pending bag ids:', err);
    }
  }, [supabase, employeeId]);

  // Call the above functions on mount.
  useEffect(() => {
    fetchEmployeeId();
  }, [fetchEmployeeId]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  useEffect(() => {
    fetchPendingBagIds();
  }, [fetchPendingBagIds]);

  // Filter inventory based on filter controls.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filteredBags = inventory.filter(bag => {
    if (bag.current_status !== 'in_inventory') return false;
    if (selectedHarvestRoom && bag.harvest_room_id !== selectedHarvestRoom) return false;
    if (selectedStrain && bag.strain_id !== selectedStrain) return false;
    if (selectedBagSize && bag.size_category_id !== selectedBagSize) return false;
    if (filterToday) {
      if (!bag.created_at) return false; // Skip bags without a creation date
      const bagDate = new Date(bag.created_at);
      bagDate.setHours(0, 0, 0, 0);
      if (bagDate.getTime() !== today.getTime()) return false;
    }
    return true;
  });

  function groupInventory(bags: BagRecord[]): Record<string, { bags: BagRecord[]; count: number }> {
    const groups: Record<string, { bags: BagRecord[]; count: number }> = {};
    const inInventory = bags.filter(bag => bag.current_status === 'in_inventory');
    inInventory.forEach(bag => {
      const key = `${bag.harvest_room_id || 'unknown'}|${bag.strain_id || 'unknown'}|${bag.size_category_id || 'unknown'}`;
      if (!groups[key]) {
        groups[key] = { bags: [], count: 0 };
      }
      groups[key].count++;
      groups[key].bags.push(bag);
    });
    return groups;
  }

  async function handleCompleteReserveRequest() {
    if (!employeeId) {
      alert('Employee information not loaded yet.');
      return;
    }
    const groups = groupInventory(filteredBags);
    const reserveItems: { bag_id: string }[] = [];
    Object.entries(selection).forEach(([groupKey, qty]) => {
      if (qty > 0) {
        const group = groups[groupKey];
        if (group) {
          group.bags.slice(0, qty).forEach(bag => {
            reserveItems.push({ bag_id: bag.id });
          });
        }
      }
    });

    console.log('Submitting reserve request with employeeId:', employeeId, reserveItems);

    try {
      const { data, error } = await supabase.rpc('create_reserve_request', {
        p_employee_id: employeeId,
        p_items: reserveItems
      });
      if (error) {
        console.error('Error creating reserve request:', error);
        throw new Error(error.message);
      }
      console.log('Reserve request submitted successfully:', data);
      setSuccessMessage('Reserve request submitted successfully!');
      setSelection({});
      // Refresh inventory and pending bag IDs so that the UI reflects the new state.
      await fetchInventoryData();
      await fetchPendingBagIds();
    } catch (error: any) {
      console.error('Error submitting reserve request:', error);
      alert(error.message || 'Failed to submit reserve request');
    }
  }

  return (
    <main className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">New Reserve Request</h1>
      {loading && <p>Loading inventory...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {successMessage && <p className="text-green-600 mb-4">{successMessage}</p>}
      {!loading && !error && (
        <>
          <FilterControls
            serverHarvestRooms={serverHarvestRooms}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            selectedHarvestRoom={selectedHarvestRoom}
            selectedStrain={selectedStrain}
            selectedBagSize={selectedBagSize}
            filterToday={filterToday}
            onHarvestRoomChange={setSelectedHarvestRoom}
            onStrainChange={setSelectedStrain}
            onBagSizeChange={setSelectedBagSize}
            onTodayToggle={setFilterToday}
            totalCount={filteredBags.length}
            totalWeight={filteredBags.reduce((acc, bag) => acc + bag.weight, 0)}
          />
          <GroupedInventoryReseveRequest
            bags={filteredBags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
            onSelectionChange={setSelection}
            pendingBagIds={pendingBagIds}
          />
          <button
            onClick={handleCompleteReserveRequest}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Submit Reserve Request
          </button>
        </>
      )}
    </main>
  );
}