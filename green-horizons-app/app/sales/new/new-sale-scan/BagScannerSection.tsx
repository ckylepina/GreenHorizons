'use client';

import React, { useState, useMemo } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface BagGroup {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

interface BagScannerSectionProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
  onBagsChange: (bags: BagRecord[]) => void;
}

function groupBags(bags: BagRecord[]): BagGroup[] {
  const groupsMap: Record<string, BagGroup> = {};
  bags.forEach((bag) => {
    const key = `${bag.harvest_room_id ?? 'none'}_${bag.strain_id ?? 'none'}_${bag.size_category_id ?? 'none'}_${bag.weight}`;
    if (!groupsMap[key]) {
      groupsMap[key] = {
        key,
        harvest_room_id: bag.harvest_room_id,
        strain_id: bag.strain_id,
        size_category_id: bag.size_category_id,
        weight: bag.weight,
        bags: [],
      };
    }
    groupsMap[key].bags.push(bag);
  });
  return Object.values(groupsMap);
}

const BagScannerSection: React.FC<BagScannerSectionProps> = ({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
  onBagsChange,
}) => {
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [removalMode, setRemovalMode] = useState(false);
  const [groupPrices, setGroupPrices] = useState<Record<string, number>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Group the scanned bags.
  const groups = useMemo(() => groupBags(scannedBags), [scannedBags]);

  // Helper functions for display:
  const getStrainName = (id?: string | null) =>
    initialStrains.find((s) => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    initialHarvestRooms.find((r) => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    initialBagSizes.find((b) => b.id === id)?.name || 'Unknown';

  // Fetch bag details from Supabase.
  const handleScanBag = async (qrValue: string) => {
    if (!qrValue) return;
    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qrValue)
      .single();
    if (error) {
      alert('Bag not found for QR code: ' + qrValue);
      console.error('Error fetching bag by QR code:', error);
    } else if (data) {
      const bag: BagRecord = {
        id: data.id || qrValue,
        current_status: data.current_status || 'in_inventory',
        harvest_room_id: data.harvest_room_id || 'room1',
        strain_id: data.strain_id || 'strain1',
        size_category_id: data.size_category_id || 'size1',
        created_at: data.created_at || new Date().toISOString(),
        weight: data.weight || 1,
        qr_code: data.qr_code || qrValue,
        employee_id: data.employee_id || null,
        tenant_id: data.tenant_id || 'tenant1',
        updated_at: data.updated_at || null,
      };

      if (removalMode) {
        // In removal mode, if bag is already scanned, remove it.
        if (scannedBags.some((b) => b.id === bag.id)) {
          const newBags = scannedBags.filter((b) => b.id !== bag.id);
          setScannedBags(newBags);
          onBagsChange(newBags);
          alert('Bag removed.');
        } else {
          alert('Bag not found in scanned list.');
        }
      } else {
        // Normal mode: if bag is already scanned, alert; otherwise, add it.
        if (scannedBags.some((b) => b.id === bag.id)) {
          alert('Bag already scanned.');
        } else {
          const newBags = [...scannedBags, bag];
          setScannedBags(newBags);
          onBagsChange(newBags);
        }
      }
    }
  };

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    console.log('Detected codes:', detectedCodes);
    detectedCodes.forEach(({ rawValue }) => {
      if (rawValue) {
        console.log('Scanned result:', rawValue);
        handleScanBag(rawValue);
      }
    });
  };

  // Remove a single scanned bag (if needed in expanded mode).
  const removeScannedBag = (id: string) => {
    const newBags = scannedBags.filter((bag) => bag.id !== id);
    setScannedBags(newBags);
    onBagsChange(newBags);
  };

  // Handle group price change.
  const handleGroupPriceChange = (groupKey: string, price: number) => {
    setGroupPrices((prev) => ({ ...prev, [groupKey]: price }));
  };

  const overallTotal = groups.reduce((total, group) => {
    const price = groupPrices[group.key] || 0;
    return total + price * group.bags.length;
  }, 0);

  return (
    <section className="border p-4 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-2">Grouped Bags & Group Pricing</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={() => setShowScanner((prev) => !prev)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {showScanner ? 'Hide Scanner' : 'Show Scanner'}
        </button>
        <button
          onClick={() => setRemovalMode((prev) => !prev)}
          className={`px-4 py-2 rounded ${
            removalMode ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {removalMode ? 'Removal Mode: ON' : 'Removal Mode: OFF'}
        </button>
      </div>
      {showScanner && (
        <div className="mb-4">
          <Scanner
            onScan={handleScan}
            onError={(err) => console.error('Scanner error:', err)}
            formats={['qr_code']}
            paused={!showScanner}
            allowMultiple={true}
          />
        </div>
      )}
      {groups.length > 0 ? (
        <div>
          {groups.map((group) => (
            <div key={group.key} className="border p-2 rounded mb-2">
              <div className="mb-1">
                <span className="font-semibold">Harvest Room:</span>{' '}
                {getHarvestRoomName(group.harvest_room_id)}
              </div>
              <div className="mb-1">
                <span className="font-semibold">Strain:</span>{' '}
                {getStrainName(group.strain_id)}
              </div>
              <div className="mb-1">
                <span className="font-semibold">Bag Size:</span>{' '}
                {getBagSizeName(group.size_category_id)}
              </div>
              <div className="mb-1">
                <span className="font-semibold">Weight:</span> {group.weight}
              </div>
              <div className="mb-1">
                <span className="font-semibold">Count:</span> {group.bags.length}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="font-semibold">Price per Bag:</label>
                <input
                  type="number"
                  value={groupPrices[group.key] || ''}
                  onChange={(e) =>
                    handleGroupPriceChange(group.key, parseFloat(e.target.value) || 0)
                  }
                  className="border p-1 rounded w-24"
                />
                <span>
                  Subtotal: ${(groupPrices[group.key] || 0) * group.bags.length}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.key]: !prev[group.key],
                    }))
                  }
                  className="bg-gray-500 text-white px-2 py-1 rounded"
                >
                  {expandedGroups[group.key] ? 'Hide Items' : 'Edit Group'}
                </button>
                <button
                  onClick={() => {
                    // Remove all bags in this group.
                    group.bags.forEach((bag) => removeScannedBag(bag.id));
                  }}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Remove Group
                </button>
              </div>
              {expandedGroups[group.key] && (
                <ul className="mt-2">
                  {group.bags.map((bag) => (
                    <li key={bag.id} className="flex items-center justify-between border-b pb-1">
                      <span>
                        {bag.qr_code} (ID: {bag.id})
                      </span>
                      <button
                        onClick={() => removeScannedBag(bag.id)}
                        className="bg-red-400 text-white px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="mt-2 font-bold">
            Overall Total: ${overallTotal}
          </div>
        </div>
      ) : (
        <p className="text-xs">No bags scanned yet.</p>
      )}
    </section>
  );
};

export default BagScannerSection;