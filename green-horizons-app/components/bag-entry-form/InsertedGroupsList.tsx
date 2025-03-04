'use client';

import React, { useState } from 'react';
import BulkEditForm from './BulkEditForm';
import LabelsToPrint from './LabelsToPrint';
import { InsertedGroup, Strain, BagSize, HarvestRoom, BagRecord } from './types';

/**
 * Opens a new window with custom print CSS and triggers print().
 * This version is optimized for laptop printing.
 */
function printLabels(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Labels</title>
        <style>
          /* Screen styles for preview */
          @media screen {
            body {
              margin: 20px;
              padding: 0;
            }
            .label {
              width: 3.5in;
              height: 1in;
              border: 1px solid #000;
              margin: 10px auto;
            }
          }
          /* Print styles */
          @media print {
            @page {
              size: 3.5in 1in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .label {
              width: 3.5in;
              height: 1in;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              border: none !important;  /* Override inline border */
              margin: 0 !important;
              padding: 0.1in; /* preserve padding if needed */
            }
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
  const [areLabelsLoading, setAreLabelsLoading] = useState(false);

  const toggleLabels = (groupId: string) => {
    if (showLabelsForGroup === groupId) {
      setShowLabelsForGroup(null);
    } else {
      setAreLabelsLoading(true);
      setShowLabelsForGroup(groupId);
      setTimeout(() => {
        setAreLabelsLoading(false);
      }, 1000);
    }
  };

  // Grab the hidden printable HTML and pass it to printLabels().
  const printGroupLabels = (groupId: string) => {
    const printableArea = document.getElementById(`printable-area-${groupId}`);
    if (printableArea) {
      printLabels(printableArea.innerHTML);
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
            <div className="flex flex-col gap-1 mb-2">
              <strong>Group #{index + 1}</strong>
              <span>{group.bagCount} bag(s) inserted</span>
              <span className="text-sm text-gray-600">
                Inserted at {group.insertedAt}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleLabels(group.groupId)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                {showLabelsForGroup === group.groupId ? 'Hide Labels' : 'Show/Print Labels'}
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

            {/* Hidden printable container */}
            <div id={`printable-area-${group.groupId}`} className="hidden">
              <LabelsToPrint
                bags={group.bags}
                serverStrains={serverStrains}
                serverBagSizes={serverBagSizes}
                serverHarvestRooms={serverHarvestRooms}
              />
            </div>

            {showLabelsForGroup === group.groupId && (
              <div className="mt-4">
                {areLabelsLoading ? (
                  <p className="text-center text-sm">Loading labels...</p>
                ) : (
                  <>
                    <div className="border p-2">
                      <LabelsToPrint
                        bags={group.bags}
                        serverStrains={serverStrains}
                        serverBagSizes={serverBagSizes}
                        serverHarvestRooms={serverHarvestRooms}
                      />
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={() => printGroupLabels(group.groupId)}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Print Now
                      </button>
                    </div>
                  </>
                )}
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