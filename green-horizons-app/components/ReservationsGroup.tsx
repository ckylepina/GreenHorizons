'use client';

import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaQrcode, FaTimes } from 'react-icons/fa';
import { useQRCode } from 'next-qrcode';

/**  
 * Exactly what your Supabase query returns for each bag  
 */
export interface ReservedBag {
  id: string;
  qr_code: string;
  reserved_for: string;
  updated_at: string;
  weight: number;
  // always arrays from the join:
  harvest_room?: { name: string }[];
  strain?:       { name: string }[];
  size?:         { name: string }[];
  // reserved_by?:   string;   // if you later add that column
}

/** one group of identical strain–size */
export interface GroupedReservation {
  key:        string;
  strainName: string;
  sizeName:   string;
  bags:       ReservedBag[];
}

interface ReservationsGroupProps {
  group: GroupedReservation;
}

export const ReservationsGroup: React.FC<ReservationsGroupProps> = ({ group }) => {
  const [expanded, setExpanded] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; text: string }>({
    open: false,
    text: '',
  });
  const { Image: QRImage } = useQRCode();

  function firstName(arr?: { name: string }[]): string {
    return arr && arr.length > 0 ? arr[0].name : 'Unknown';
  }

  return (
    <>
      <div className="border rounded mb-4 bg-white dark:bg-gray-800">
        <button
          className="w-full p-4 flex justify-between items-center"
          onClick={() => setExpanded((e) => !e)}
        >
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {group.strainName} — {group.sizeName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {group.bags.length} bag{group.bags.length > 1 ? 's' : ''}
            </p>
          </div>
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        {expanded && (
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border px-2 py-1">Bag ID</th>
                  <th className="border px-2 py-1">Harvest #</th>
                  <th className="border px-2 py-1">Weight</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Reserved For</th>
                  {/* <th className="border px-2 py-1">Reserved By</th> */}
                  <th className="border px-2 py-1">QR</th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map((bag) => (
                  <tr
                    key={bag.id}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-2 py-1 text-gray-800 dark:text-gray-200">
                      {bag.id}
                    </td>
                    <td className="px-2 py-1">
                      { /* prefix H for harvest numbers */ }
                      H{firstName(bag.harvest_room)}
                    </td>
                    <td className="px-2 py-1">
                      {bag.weight.toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      {new Date(bag.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-1">{bag.reserved_for}</td>
                    {/*
                    <td className="px-2 py-1">{bag.reserved_by}</td>
                    */}
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() =>
                          setQrModal({ open: true, text: bag.qr_code })
                        }
                        className="text-blue-600 hover:text-blue-800"
                        title="View QR Code"
                      >
                        <FaQrcode />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setQrModal({ open: false, text: '' })}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setQrModal({ open: false, text: '' })}
              title="Close"
            >
              <FaTimes />
            </button>
            <div className="flex justify-center">
              <QRImage text={qrModal.text} options={{ scale: 8 }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
