'use client';

import React, { useState, useMemo } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import type { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';
import { FaPlus, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Component to scan bags and reserve or dispatch them, grouped by group_id
export default function ReserveBagScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}: {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}) {
  type ActionType = 'reserved' | 'out_for_delivery';

  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [reservedFor, setReservedFor] = useState('');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [deliveredTo, setDeliveredTo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const lastScanned = React.useRef<string | null>(null);

  // Reset state
  const handleBack = () => {
    setActionType(null);
    setShowScanner(false);
    setScannedBags([]);
    setReservedFor('');
    setDeliveredBy('');
    setDeliveredTo('');
    setExpandedGroups({});
  };

  // Group scannedBags by group_id or individual id
  const groups = useMemo(() => {
    const map: Record<string, { group_id: string; bags: BagRecord[] }> = {};
    scannedBags.forEach(bag => {
      const key = bag.group_id ?? bag.id;
      if (!map[key]) map[key] = { group_id: key, bags: [] };
      map[key].bags.push(bag);
    });
    return Object.values(map);
  }, [scannedBags]);

  // Helper to get names
  const getName = (list: { id: string; name: string }[], id: string | null) =>
    id ? list.find(x => x.id === id)?.name ?? 'Unknown' : 'Unknown';

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  // Scanner callback
  async function handleScan(codes: IDetectedBarcode[]) {
    for (const { rawValue } of codes) {
      if (!rawValue || lastScanned.current === rawValue) continue;
      lastScanned.current = rawValue;
      const { data, error } = await supabase
        .from('bags')
        .select('*')
        .eq('id', rawValue)
        .eq('current_status', 'in_inventory')
        .single();
      if (!error && data) setScannedBags(prev => prev.some(b => b.id === data.id) ? prev : [...prev, data]);
      setTimeout(() => { lastScanned.current = null; }, 1000);
    }
  }

  // Add entire group
  async function addGroup(groupId: string) {
    setProcessing(true);
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('group_id', groupId)
      .eq('current_status', 'in_inventory');
    if (!error && data) {
      setScannedBags(prev => {
        const existing = new Set(prev.map(b => b.id));
        const toAdd = data.filter(b => !existing.has(b.id));
        return [...prev, ...toAdd];
      });
    }
    setProcessing(false);
  }

  // Remove entire group
  function removeGroup(groupId: string) {
    setScannedBags(prev => prev.filter(b => (b.group_id ?? b.id) !== groupId));
    setExpandedGroups(prev => {
      const copy = { ...prev };
      delete copy[groupId];
      return copy;
    });
  }

  // Submit reservation/delivery
  async function submitAction() {
    if (!actionType || scannedBags.length === 0) return;
    setProcessing(true);
    const ids = scannedBags.map(b => b.id);
    const updateFields: Partial<BagRecord> & Record<string,string> = { current_status: actionType };
    if (actionType === 'reserved') updateFields.reserved_for = reservedFor;
    else {
      updateFields.delivery_person = deliveredBy;
      updateFields.delivery_recipient = deliveredTo;
    }
    const { error } = await supabase.from('bags').update(updateFields).in('id', ids);
    if (!error) alert(`Marked ${ids.length} bag(s) as ${actionType.replace('_',' ')}`);
    setProcessing(false);
    handleBack();
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6 text-gray-900 dark:text-gray-100">
      {/* Step 1: Action Choice */}
      {!actionType ? (
        <div className="flex gap-4 justify-center">
          <button onClick={() => setActionType('reserved')} className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded">
            Reserve Bags
          </button>
          <button onClick={() => setActionType('out_for_delivery')} className="px-6 py-3 bg-green-500 dark:bg-green-700 text-white rounded">
            Out for Delivery
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          <button onClick={handleBack} className="text-sm text-gray-700 dark:text-gray-300 hover:underline">
            ← Change Action
          </button>
          <button onClick={() => setShowScanner(s => !s)} className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded">
            {showScanner ? 'Hide Scanner' : 'Show Scanner'}
          </button>
        </div>
      )}

      {/* Step 2: Scanner */}
      {actionType && showScanner && (
        <div className="border p-4 rounded bg-white dark:bg-gray-800">
          <h3 className="font-semibold mb-2">
            {actionType === 'reserved' ? 'Scan to Reserve' : 'Scan to Dispatch'}
          </h3>
          <Scanner onScan={handleScan} onError={console.error} formats={['qr_code']} />
          <p className="mt-2 text-sm">{scannedBags.length} scanned bag(s)</p>
        </div>
      )}

      {/* Step 3: Group list */}
      {actionType && groups.map(g => {
        const isOpen = expandedGroups[g.group_id] ?? false;
        const sample = g.bags[0];
        const strainName = getName(initialStrains, sample.strain_id);
        const sizeName = getName(initialBagSizes, sample.size_category_id);
        const roomName = getName(initialHarvestRooms, sample.harvest_room_id);

        return (
          <div key={g.group_id} className="border rounded bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between p-4">
              <div onClick={() => toggleGroup(g.group_id)} className="flex-1 flex items-center cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {strainName} — {sizeName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {g.bags.length} bag{g.bags.length>1?'s':''}
                  </p>
                </div>
                <div className="ml-auto text-gray-500">
                  {isOpen ? <FaChevronUp /> : <FaChevronDown />}  
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => addGroup(g.group_id)} disabled={processing} className="p-1 bg-gray-500 rounded disabled:opacity-50">
                  <FaPlus />
                </button>
                <button onClick={() => removeGroup(g.group_id)} className="p-1 bg-red-500 rounded">
                  <FaTrash />
                </button>
              </div>
            </div>
            {isOpen && (
              <div className="p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border px-2 py-1">ID</th>
                    <th className="border px-2 py-1">Room</th>
                    <th className="border px-2 py-1">Weight</th>
                    <th className="border px-2 py-1">Status</th>
                  </tr></thead>
                  <tbody>
                    {g.bags.map(b => (
                      <tr key={b.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{b.id}</td>
                        <td className="px-2 py-1">{roomName}</td>
                        <td className="px-2 py-1">{b.weight.toFixed(2)}</td>
                        <td className="px-2 py-1">{b.current_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Step 4: Form */}
      {actionType && (
        <div className="border p-4 rounded bg-white dark:bg-gray-800 space-y-4">
          {actionType==='reserved'?
            <label className="block">
              <span>Reserve For</span>
              <input value={reservedFor} onChange={e=>setReservedFor(e.target.value)} placeholder="Customer or Dept"
                     className="mt-1 w-full p-2 border rounded" />
            </label>
          :
            <>
              <label className="block"><span>Delivered By</span>
                <input value={deliveredBy} onChange={e=>setDeliveredBy(e.target.value)} placeholder="Employee"
                       className="mt-1 w-full p-2 border rounded" />
              </label>
              <label className="block"><span>Delivered To</span>
                <input value={deliveredTo} onChange={e=>setDeliveredTo(e.target.value)} placeholder="Customer or Dept"
                       className="mt-1 w-full p-2 border rounded" />
              </label>
            </>
          }
          <button onClick={submitAction} disabled={processing||!scannedBags.length}
                  className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {processing?'Saving…':actionType==='reserved'?'Confirm Reservation':'Confirm Delivery'}
          </button>
        </div>
      )}
    </div>
  );
}