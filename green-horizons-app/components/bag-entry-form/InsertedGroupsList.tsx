// components/bag-entry-form/InsertedGroupsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import BulkEditForm from './BulkEditForm';
import LabelsToPrint from './LabelsToPrint';
import { InsertedGroup, Strain, BagSize, HarvestRoom, BagRecord } from './types';

/**
 * This helper function opens a new window with the given HTML content
 * and then calls print() on that window.
 */
function printLabels(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Labels</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

interface InsertedGroupsListProps {
  allGroups: InsertedGroup[];
  loading: boolean;
  bulkEditMode: boolean;
  bulkEditGroupId: string | null;
  // Removed onReprintGroup since it's not used.
  onStartBulkEdit: (groupId: string) => void;
  onCancelBulkEdit: () => void;
  onApplyBulkEdit: (fields: Partial<BagRecord>) => Promise<void>;
  serverHarvestRooms: HarvestRoom[];
  reversedRooms: HarvestRoom[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
}

export default function InsertedGroupsList({
  allGroups,
  loading,
  bulkEditMode,
  bulkEditGroupId,
  onStartBulkEdit,
  onCancelBulkEdit,
  onApplyBulkEdit,
  serverHarvestRooms,
  reversedRooms,
  serverStrains,
  serverBagSizes,
}: InsertedGroupsListProps) {
  const [showLabelsForGroup, setShowLabelsForGroup] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [areLabelsLoading, setAreLabelsLoading] = useState(false);

  // Listen for the afterprint event to clear the printing indicator.
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // This function triggers printing using the always-rendered hidden container.
  const handlePrintNow = (groupId: string) => {
    setIsPrinting(true);
    const content = document.getElementById(`printable-area-${groupId}`)?.innerHTML;
    if (content) {
      printLabels(content);
    }
  };

  // When toggling "Show/Print Labels," simulate a loading delay.
  const toggleLabels = (groupId: string) => {
    if (showLabelsForGroup === groupId) {
      setShowLabelsForGroup(null);
    } else {
      setAreLabelsLoading(true);
      setShowLabelsForGroup(groupId);
      setTimeout(() => {
        setAreLabelsLoading(false);
      }, 1000); // adjust delay as needed
    }
  };

  if (allGroups.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 max-w-xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">Inserted Groups This Session</h3>
      <ul className="space-y-6">
        {allGroups.map((group, index) => (
          <li key={group.groupId} className="border p-4 rounded-md">
            <div className="flex flex-col gap-1 mb-2 print:hidden">
              <strong>Group #{index + 1}</strong>
              <span>{group.bagCount} bag(s) inserted</span>
              <span className="text-sm text-gray-600">
                Inserted at {group.insertedAt}
              </span>
            </div>

            {/* Buttons for non-print view */}
            <div className="print:hidden">
              <button
                onClick={() => handlePrintNow(group.groupId)}
                className="bg-green-600 text-white px-3 py-1 rounded mr-2"
              >
                Reprint Group
              </button>
              <button
                onClick={() => toggleLabels(group.groupId)}
                className="bg-yellow-500 text-white px-3 py-1 rounded mr-2"
              >
                {showLabelsForGroup === group.groupId
                  ? 'Hide Labels'
                  : 'Show/Print Labels'}
              </button>
              {(!bulkEditMode || bulkEditGroupId !== group.groupId) && (
                <button
                  onClick={() => onStartBulkEdit(group.groupId)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Bulk Edit Group
                </button>
              )}
            </div>

            {/* Always render the printable labels container (hidden on screen but available for printing) */}
            <div id={`printable-area-${group.groupId}`} className="hidden print:block">
              <LabelsToPrint
                bags={group.bags}
                serverStrains={serverStrains}
                serverBagSizes={serverBagSizes}
                serverHarvestRooms={serverHarvestRooms}
              />
            </div>

            {/* Optionally render visible labels if toggled */}
            {showLabelsForGroup === group.groupId && (
              <div className="mt-4 print:hidden">
                {areLabelsLoading ? (
                  <p className="text-center text-sm">Loading labels...</p>
                ) : (
                  <LabelsToPrint
                    bags={group.bags}
                    serverStrains={serverStrains}
                    serverBagSizes={serverBagSizes}
                    serverHarvestRooms={serverHarvestRooms}
                  />
                )}
                <div className="mt-2 print:hidden">
                  <button
                    onClick={() => handlePrintNow(group.groupId)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Print Now
                  </button>
                  {isPrinting && <p className="text-center text-sm">Loading...</p>}
                </div>
              </div>
            )}

            {bulkEditMode && bulkEditGroupId === group.groupId && (
              <BulkEditForm
                loading={loading}
                onCancel={onCancelBulkEdit}
                onApplyBulkEdit={onApplyBulkEdit}
                reversedRooms={reversedRooms}
                serverStrains={serverStrains}
                serverBagSizes={serverBagSizes}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}