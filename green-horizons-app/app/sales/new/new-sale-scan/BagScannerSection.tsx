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
  const [groupPrices, setGroupPrices] = useState<Record<string, number>>({});

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
      // Create a complete bag record with default values as needed.
      const bag: BagRecord = {
        id: data.id || qrValue,
        current_status: data.current_status || 'in_inventory',
        harvest_room_id: data.harvest_room_id || 'room1',
        strain_id: data.strain_id || 'strain1',
        size_category_id: data.size_category_id || 'size1',
        created_at: data.created_at || new Date().toISOString(),
        weight: data.weight || 1,
        qr_code: data.qr_code || qrValue,
        // Required additional fields:
        employee_id: data.employee_id || null,
        tenant_id: data.tenant_id || 'tenant1',
        updated_at: data.updated_at || null,
      };
      if (scannedBags.some((b) => b.id === bag.id)) {
        alert('Bag already scanned.');
      } else {
        const newBags = [...scannedBags, bag];
        setScannedBags(newBags);
        onBagsChange(newBags);
      }
    }
  };

  // onScan now accepts an array of detected codes.
  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    console.log('Detected codes:', detectedCodes);
    detectedCodes.forEach(({ rawValue }) => {
      if (rawValue) {
        console.log('Scanned result:', rawValue);
        handleScanBag(rawValue);
      }
    });
  };

  const removeScannedBag = (id: string) => {
    const newBags = scannedBags.filter((bag) => bag.id !== id);
    setScannedBags(newBags);
    onBagsChange(newBags);
  };

  const handleGroupPriceChange = (groupKey: string, price: number) => {
    setGroupPrices((prev) => ({ ...prev, [groupKey]: price }));
  };

  const overallTotal = groups.reduce((total, group) => {
    const price = groupPrices[group.key] || 0;
    return total + price * group.bags.length;
  }, 0);

  return (
    <section className="border p-4 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-2">Scanned Bags & Group Pricing</h2>
      <div className="mb-4">
        <button
          onClick={() => setShowScanner((prev) => !prev)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {showScanner ? 'Hide Scanner' : 'Show Scanner'}
        </button>
      </div>
      <div className="mb-4">
      <Scanner
        onScan={handleScan}
        onError={(err) => console.error('Scanner error:', err)}
        formats={['qr_code']} // Restricts scanning to only QR codes
        paused={!showScanner}
        allowMultiple={true}
      />
      </div>
      {scannedBags.length > 0 ? (
        <>
          <div className="mb-4">
            <h3 className="font-bold text-lg">Ungrouped Scanned Bags</h3>
            <ul className="list-disc pl-5">
              {scannedBags.map((bag) => (
                <li key={bag.id}>
                  ID: {bag.id} – {bag.qr_code}
                  <button onClick={() => removeScannedBag(bag.id)} className="ml-2 text-red-500">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">Grouped Bags</h3>
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
                <div className="flex items-center gap-2">
                  <label className="font-semibold">Price per Bag: </label>
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
              </div>
            ))}
            <div className="mt-2 font-bold">
              Overall Total: ${overallTotal}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs">No bags scanned yet.</p>
      )}
    </section>
  );
};

export default BagScannerSection;