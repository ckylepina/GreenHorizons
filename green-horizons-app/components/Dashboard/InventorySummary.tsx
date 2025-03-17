'use client';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import LabelsToPrint from '../bag-entry-form/LabelsToPrint';
import { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';
import { FilterControls } from '../Inventory/FilterControls';
import { InventoryGroup, GroupedInventory } from '../Inventory/InventoryGroup';

interface InventorySummaryProps {
  bags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
}

export default function InventorySummary({
  bags,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
}: InventorySummaryProps) {
  // Filter controls state
  const [selectedHarvestRoom, setSelectedHarvestRoom] = useState<string>('');
  const [selectedStrain, setSelectedStrain] = useState<string>('');
  const [selectedBagSize, setSelectedBagSize] = useState<string>('');
  const [filterToday, setFilterToday] = useState<boolean>(false);

  // State for toggling filter controls
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // NEW: State to track which group is expanded (by key)
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  // State for group editing: which group is currently being edited
  const [editedGroup, setEditedGroup] = useState<GroupedInventory | null>(null);
  const [editedGroupParams, setEditedGroupParams] = useState({
    strain: '',
    bagSize: '',
    harvestRoom: '',
  });

  // Compute available harvest rooms from inventory
  const availableHarvestRooms = serverHarvestRooms.filter((room) =>
    bags.some((bag) => bag.current_status === 'in_inventory' && bag.harvest_room_id === room.id)
  );

  // Sort available harvest rooms descending by numeric value extracted from the name
  const sortedAvailableHarvestRooms = [...availableHarvestRooms].sort((a, b) => {
    const aNum = parseInt(a.name.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.name.replace(/\D/g, '')) || 0;
    return bNum - aNum;
  });

  // Get today's date (time zeroed out)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter bags based on controls
  const filteredBags = bags.filter((bag) => {
    if (bag.current_status !== 'in_inventory') return false;
    if (selectedHarvestRoom && bag.harvest_room_id !== selectedHarvestRoom) return false;
    if (selectedStrain && bag.strain_id !== selectedStrain) return false;
    if (selectedBagSize && bag.size_category_id !== selectedBagSize) return false;
    if (filterToday) {
      if (!bag.created_at) return false;
      const bagDate = new Date(bag.created_at);
      bagDate.setHours(0, 0, 0, 0);
      if (bagDate.getTime() !== today.getTime()) return false;
    }
    return true;
  });

  // Group filtered bags by harvest room, strain, and bag size.
  const groups: GroupedInventory[] = [];
  filteredBags.forEach((bag) => {
    const harvestRoomName =
      serverHarvestRooms.find((r) => r.id === bag.harvest_room_id)?.name || 'Unknown';
    const strainName =
      serverStrains.find((s) => s.id === bag.strain_id)?.name || 'Unknown';
    const bagSizeName =
      serverBagSizes.find((b) => b.id === bag.size_category_id)?.name || 'Unknown';
    const key = `${harvestRoomName} - ${strainName} - ${bagSizeName}`;
    const existingGroup = groups.find((group) => group.key === key);
    if (existingGroup) {
      existingGroup.count += 1;
      existingGroup.totalWeight += bag.weight;
      existingGroup.bags.push(bag);
    } else {
      groups.push({
        key,
        harvestRoomName,
        strainName,
        bagSizeName,
        count: 1,
        totalWeight: bag.weight,
        bags: [bag],
      });
    }
  });

  // Compute totals over filtered bags.
  const totalCount = filteredBags.length;
  const totalWeight = filteredBags.reduce((acc, bag) => acc + bag.weight, 0);

  // Handler for printing a group using the LabelsToPrint component.
  const handlePrintGroup = (bagsToPrint: BagRecord[]) => {
    console.log('Print group:', bagsToPrint);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
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
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
      const printRootDiv = printWindow.document.getElementById('print-root');
      if (printRootDiv) {
        const root = createRoot(printRootDiv);
        root.render(
          <LabelsToPrint
            bags={bagsToPrint}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
          />
        );
        // Increase delay to allow QR codes to fully render (try 5000ms)
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 5000);
      }
    };
  };

  // Handler for initiating edit on a group.
  const handleEditGroup = (group: GroupedInventory) => {
    console.log('Edit group:', group);
    setEditedGroup(group);
    setEditedGroupParams({
      strain: group.strainName,
      bagSize: group.bagSizeName,
      harvestRoom: group.harvestRoomName,
    });
    // Ensure the group is expanded when editing.
    setExpandedGroupKey(group.key);
  };

  // Handler for saving group changes.
  const handleSaveGroup = () => {
    console.log('Save group changes', editedGroup, editedGroupParams);
    // (Update logic would go here.)
    setEditedGroup(null);
    setEditedGroupParams({
      strain: '',
      bagSize: '',
      harvestRoom: '',
    });
  };

  // Handler for canceling group edit.
  const handleCancelGroupEdit = () => {
    console.log('Cancel group edit');
    setEditedGroup(null);
    setEditedGroupParams({
      strain: '',
      bagSize: '',
      harvestRoom: '',
    });
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      {showFilters && (
        <FilterControls
          serverHarvestRooms={sortedAvailableHarvestRooms}
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
          totalCount={totalCount}
          totalWeight={totalWeight}
        />
      )}
      {groups.length === 0 ? (
        <p>No bags found for selected filters.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <InventoryGroup
              key={group.key}
              group={group}
              expanded={
                expandedGroupKey === group.key || (editedGroup?.key === group.key)
              }
              onToggle={() => {
                // Only allow toggle if this group is not in edit mode.
                if (editedGroup?.key === group.key) return;
                setExpandedGroupKey((prev) =>
                  prev === group.key ? null : group.key
                );
              }}
              onPrint={() => handlePrintGroup(group.bags)}
              editing={editedGroup?.key === group.key}
              onEditToggle={() => handleEditGroup(group)}
              onSaveGroup={handleSaveGroup}
              onCancelGroupEdit={handleCancelGroupEdit}
              serverStrains={serverStrains}
              serverBagSizes={serverBagSizes}
              serverHarvestRooms={serverHarvestRooms}
              editedGroupParams={
                editedGroup?.key === group.key
                  ? editedGroupParams
                  : { strain: '', bagSize: '', harvestRoom: '' }
              }
              onGroupParamChange={(field, value) => {
                setEditedGroupParams((prev) => ({
                  ...prev,
                  [field]: value,
                }));
              }}
            />
          ))}
        </div>
      )}

      {/* Offscreen printable container – note: instead of "hidden" we use offscreen styles */}
      {groups.map((group) => (
        <div
          key={`printable-${group.key}`}
          id={`printable-area-${group.key}`}
          style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
        >
          <LabelsToPrint
            bags={group.bags}
            serverStrains={serverStrains}
            serverBagSizes={serverBagSizes}
            serverHarvestRooms={serverHarvestRooms}
          />
        </div>
      ))}
    </div>
  );
}