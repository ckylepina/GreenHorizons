'use client';

import React, { useState, useRef } from 'react';
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaPrint } from 'react-icons/fa';
import type { BagRecord, Strain, BagSize, HarvestRoom } from './types';
import LabelsToPrint from './LabelsToPrint';

export interface GroupedBags {
  key: string;
  harvest_room_id: string | null;
  strain_id:       string | null;
  size_category_id:string | null;
  weight:          number;
  bags:            BagRecord[];
}

interface InsertedGroupProps {
  group: GroupedBags;
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
  serverHarvestRooms: HarvestRoom[];
  onEdit: () => void;
  onDelete: () => void;
}

// 👉 Your old print helper, inlined here
function printLabels(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Labels</title>
        <style>
          /* Screen preview */
          @media screen {
            body { margin: 20px; padding: 0; }
            .label { width: 3.5in; height: 1in; border: 1px solid #000; margin: 10px auto; }
          }
          /* Print layout */
          @media print {
            @page { size: 3.5in 1in; margin: 0; }
            body { margin: 0; padding: 0; }
            .label {
              width: 3.5in; height: 1in;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              border: none !important;
              margin: 0 !important;
              padding: 0.1in;
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

export default function InsertedGroup({
  group,
  serverStrains,
  serverBagSizes,
  serverHarvestRooms,
  onEdit,
  onDelete,
}: InsertedGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Look up names
  const harvestName =
    serverHarvestRooms.find(r => r.id === group.harvest_room_id)?.name ?? 'Unknown';
  const strainName =
    serverStrains.find(s => s.id === group.strain_id)?.name ?? 'Unknown';
  const sizeName =
    serverBagSizes.find(b => b.id === group.size_category_id)?.name ?? 'Unknown';

  function handlePrint() {
    if (!printableRef.current) return;
    printLabels(printableRef.current.innerHTML);
  }

  return (
    <div className="border rounded mb-4 bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {strainName} — {sizeName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            H{harvestName} | Qty: {group.bags.length} | Total:{' '}
            {group.weight.toFixed(2)} lbs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800"
            title="Edit this group"
          >
            <FaEdit />
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800"
            title="Delete this group"
          >
            <FaTrash />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-gray-600 hover:text-gray-800"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* Expanded area */}
      {expanded && (
        <div className="border-t p-4">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800 mb-4"
          >
            <FaPrint />
            <span>Print Labels</span>
          </button>

          {/* Hidden printable HTML */}
          <div ref={printableRef} className="space-y-2">
            <LabelsToPrint
              groupKey={group.key}
              bags={group.bags}
              serverStrains={serverStrains}
              serverBagSizes={serverBagSizes}
              serverHarvestRooms={serverHarvestRooms}
            />
          </div>
        </div>
      )}
    </div>
  );
}