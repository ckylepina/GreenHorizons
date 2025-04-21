'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/utils/supabase/supabaseclient';
import LabelsToPrint from '@/components/bag-entry-form/LabelsToPrint';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

// Grouping type for scanned bags.
interface GroupedBags {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

// Helper function to group bags by harvest_room_id, strain_id, size_category_id, and weight.
function groupBags(bags: BagRecord[]): GroupedBags[] {
  const groupsMap: Record<string, GroupedBags> = {};
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

interface EditBagScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

const EditBagScanClient: React.FC<EditBagScanClientProps> = ({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}) => {
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  // Bulk edit fields for the currently editing group.
  const [editFields, setEditFields] = useState<Partial<BagRecord>>({});
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const lastScannedCodeRef = useRef<string | null>(null);

  // Group the scanned bags.
  const groups = useMemo(() => groupBags(scannedBags), [scannedBags]);

  // Helper lookup functions.
  const getStrainName = (id?: string | null) =>
    initialStrains.find((s) => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    initialHarvestRooms.find((r) => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    initialBagSizes.find((b) => b.id === id)?.name || 'Unknown';

  // QR scanning: verify the bag is in_inventory.
  const handleScanBag = async (qrValue: string) => {
    if (!qrValue) return;
    if (lastScannedCodeRef.current === qrValue) return;
    lastScannedCodeRef.current = qrValue;

    const { data, error } = await supabase
      .from('bags')
      .select('*')
      .eq('qr_code', qrValue)
      .eq('current_status', 'in_inventory')
      .single();

    if (error) {
      alert('Bag not found or not available for QR code: ' + qrValue);
      console.error('Error fetching bag by QR code:', error);
      return;
    }
    if (data) {
      const bag: BagRecord = {
        id: data.id || qrValue,
        current_status: data.current_status || 'in_inventory',
        harvest_room_id: data.harvest_room_id || null,
        strain_id: data.strain_id || null,
        size_category_id: data.size_category_id || '',
        created_at: data.created_at || new Date().toISOString(),
        weight: data.weight || 1,
        qr_code: data.qr_code || qrValue,
        employee_id: data.employee_id || null,
        tenant_id: data.tenant_id,
        updated_at: data.updated_at || null,
      };

      setScannedBags(prev => {
        if (prev.some(b => b.id === bag.id)) {
          alert('Bag already scanned.');
          return prev;
        } else {
          return [...prev, bag];
        }
      });
    }
    setTimeout(() => {
      lastScannedCodeRef.current = null;
    }, 1000);
  };

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    detectedCodes.forEach(({ rawValue }) => {
      if (rawValue) {
        handleScanBag(rawValue);
      }
    });
    setTimeout(() => setIsProcessingScan(false), 1000);
  };

  // Update the group in the database.
  const updateGroup = async (groupKey: string, fields: Partial<BagRecord>) => {
    const group = groups.find(g => g.key === groupKey);
    if (!group) return;
    const bagIds = group.bags.map(b => b.id);

    // 1) Update Supabase
    const { data, error } = await supabase
      .from('bags')
      .update(fields)
      .in('id', bagIds)
      .select();
    if (error) {
      alert('Error updating group: ' + error.message);
      return;
    }

    // 2) Push same changes into Zoho for each bag
    await Promise.all(
      data!.map(async (bag) => {
        await fetch('/api/zoho/updateItem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: bag.id,
            name: initialStrains.find(s => s.id === fields.strain_id)?.name ?? bag.id,
            cf_harvest: fields.harvest_room_id ?? '',
            cf_size: fields.size_category_id ?? '',
            // if you also want to update rate/purchase_rate:
            rate: 0,
            purchase_rate: 0,
          }),
        });
      })
    );

    // 3) Reflect changes locally
    setScannedBags(prev =>
      prev.map(bag => bagIds.includes(bag.id) ? { ...bag, ...fields } : bag)
    );

    alert('Group updated in both Supabase & Zoho.');
    setEditingGroupKey(null);
    setEditFields({});
  };

  // Print new labels for a group.
  const printLabelsForGroup = (groupKey: string) => {
    const printableArea = document.getElementById(`printable-area-${groupKey}`);
    if (printableArea) {
      const htmlContent = printableArea.innerHTML.trim();
      if (!htmlContent) {
        alert('No labels to print.');
        return;
      }
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Labels</title>
            <style>
              @media print {
                @page {
                  size: 3.5in 1.1in;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .label {
                  page-break-inside: avoid;
                  break-inside: avoid;
                  border: none !important;
                }
              }
            </style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Edit Bags (Scan QR Codes)</h1>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowScanner(prev => !prev)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {showScanner ? 'Hide Scanner' : 'Show Scanner'}
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
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.key} className="border p-4 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <div>
                    <span className="font-semibold">Harvest Room:</span>{' '}
                    {group.harvest_room_id ? getHarvestRoomName(group.harvest_room_id) : 'Unknown'}
                  </div>
                  <div>
                    <span className="font-semibold">Strain:</span>{' '}
                    {group.strain_id ? getStrainName(group.strain_id) : 'Unknown'}
                  </div>
                  <div>
                    <span className="font-semibold">Bag Size:</span>{' '}
                    {group.size_category_id ? getBagSizeName(group.size_category_id) : 'Unknown'}
                  </div>
                  <div>
                    <span className="font-semibold">Weight:</span> {group.weight} lbs
                  </div>
                  <div>
                    <span className="font-semibold">Count:</span> {group.bags.length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingGroupKey(group.key);
                      setEditFields({
                        harvest_room_id: group.harvest_room_id || '',
                        strain_id: group.strain_id || '',
                        size_category_id: group.size_category_id || '',
                        weight: group.weight,
                      });
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => printLabelsForGroup(group.key)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Print New Labels
                  </button>
                </div>
              </div>
              {editingGroupKey === group.key && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block mb-1 font-semibold">Update Harvest Room:</label>
                    <select
                      value={editFields.harvest_room_id || ''}
                      onChange={(e) =>
                        setEditFields(prev => ({ ...prev, harvest_room_id: e.target.value }))
                      }
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select Harvest Room</option>
                      {[...initialHarvestRooms]
                        .sort((a, b) => {
                          const numA = parseInt(a.name.replace(/[^\d]/g, ''), 10) || 0;
                          const numB = parseInt(b.name.replace(/[^\d]/g, ''), 10) || 0;
                          return numB - numA;
                        })
                        .map(room => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Update Strain:</label>
                    <select
                      value={editFields.strain_id || ''}
                      onChange={(e) =>
                        setEditFields(prev => ({ ...prev, strain_id: e.target.value }))
                      }
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select Strain</option>
                      {initialStrains.map(strain => (
                        <option key={strain.id} value={strain.id}>
                          {strain.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Update Bag Size:</label>
                    <select
                      value={editFields.size_category_id || ''}
                      onChange={(e) =>
                        setEditFields(prev => ({ ...prev, size_category_id: e.target.value }))
                      }
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select Bag Size</option>
                      {initialBagSizes.map(size => (
                        <option key={size.id} value={size.id}>
                          {size.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Update Weight (lbs):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.weight !== undefined ? editFields.weight : ''}
                      onChange={(e) =>
                        setEditFields(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))
                      }
                      className="border p-2 rounded w-full"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => updateGroup(group.key, editFields)}
                      className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingGroupKey(null)}
                      className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {/* Hidden printable container for this group */}
              <div id={`printable-area-${group.key}`} className="hidden">
                <LabelsToPrint
                  bags={group.bags}
                  serverStrains={initialStrains}
                  serverBagSizes={initialBagSizes}
                  serverHarvestRooms={initialHarvestRooms}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">No groups scanned yet.</p>
      )}
    </div>
  );
};

export default EditBagScanClient;