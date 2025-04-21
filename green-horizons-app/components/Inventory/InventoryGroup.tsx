'use client';

import React, { useState } from 'react';
import { BagRecord, HarvestRoom } from '@/components/bag-entry-form/types';
import { FaChevronDown, FaChevronUp, FaTrash, FaQrcode, FaTimes } from 'react-icons/fa';
import { useQRCode } from 'next-qrcode';

export interface GroupedInventory {
  key:         string;
  strainName:  string;
  bagSizeName: string;
  count:       number;
  totalWeight: number;
  bags:        BagRecord[];
}

interface InventoryGroupProps {
  group:             GroupedInventory;
  serverHarvestRooms: HarvestRoom[];
  onDeleteBag:       (bagId: string) => void;
  onDeleteGroup:     (groupKey: string) => void;
}

export const InventoryGroup: React.FC<InventoryGroupProps> = ({
  group,
  serverHarvestRooms,
  onDeleteBag,
  onDeleteGroup,
}) => {
  const [expanded, setExpanded]   = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQr, setCurrentQr] = useState<string>('');

  // next-qrcode hook:
  const { Image: QRImage } = useQRCode();

  function openQrModal(qrData: string) {
    setCurrentQr(qrData);
    setQrModalOpen(true);
  }

  function closeQrModal() {
    setQrModalOpen(false);
    setCurrentQr('');
  }

  return (
    <>
      <div className="border rounded mb-4">
        <div
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div>
            <p className="text-lg font-semibold">
              {group.strainName} – {group.bagSizeName}
            </p>
            <p className="text-sm">
              Total: {group.count} bag(s) | Total Weight: {group.totalWeight.toFixed(2)} lbs
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={e => { e.stopPropagation(); onDeleteGroup(group.key); }}
              className="text-red-600 hover:text-red-800"
              title="Delete this entire group"
            >
              <FaTrash />
            </button>
            {expanded ? <FaChevronUp size={20} /> : <FaChevronDown size={20} />}
          </div>
        </div>

        {expanded && (
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Bag ID</th>
                  <th className="border px-2 py-1">Weight</th>
                  <th className="border px-2 py-1">Harvest</th>
                  <th className="border px-2 py-1">QR Code</th>
                  <th className="border px-2 py-1">Delete</th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map(bag => (
                  <tr key={bag.id} className="border-b hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td className="px-2 py-1">{bag.id}</td>
                    <td className="px-2 py-1">{bag.weight.toFixed(2)}</td>
                    <td className="px-2 py-1">
                      {
                        serverHarvestRooms.find(r => r.id === bag.harvest_room_id)?.name
                        ?? 'Unknown'
                      }
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => openQrModal(bag.qr_code ?? '')}
                        className="text-blue-600 hover:text-blue-800"
                        title="View QR Code"
                      >
                        <FaQrcode />
                      </button>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => onDeleteBag(bag.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete this bag"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrModalOpen && currentQr && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={closeQrModal}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={closeQrModal}
              title="Close"
            >
              <FaTimes />
            </button>
            <div className="flex justify-center">
              <QRImage
                text={currentQr}
                options={{ scale: 8 }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};