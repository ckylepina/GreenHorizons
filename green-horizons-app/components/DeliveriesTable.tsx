'use client';

import React, { useState } from 'react';
import { FaEdit, FaTruck, FaQrcode, FaTimes } from 'react-icons/fa';
import { useQRCode } from 'next-qrcode';

// Must match what you selected in your server query:
export interface DeliveredBag {
  id: string;
  qr_code: string;
  delivery_person: string;
  delivery_recipient: string;
  updated_at: string;
  weight: number;
  harvest_room: { name: string }[];
  strain:       { name: string }[];
  size:         { name: string }[];
}

interface DeliveriesTableProps {
  data: DeliveredBag[];
}

export default function DeliveriesTable({ data }: DeliveriesTableProps) {
  const { Image: QRImage } = useQRCode();
  const [qrModal, setQrModal] = useState<{ open: boolean; text: string }>({
    open: false, text: ''
  });

  const openQr = (text: string) => setQrModal({ open: true, text });
  const closeQr = () => setQrModal({ open: false, text: '' });

  return (
    <div className="overflow-x-auto">
      {data.length > 0 ? (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-3 py-2 border">ID</th>
              <th className="px-3 py-2 border">Delivered By</th>
              <th className="px-3 py-2 border">Delivered To</th>
              <th className="px-3 py-2 border">Room</th>
              <th className="px-3 py-2 border">Strain</th>
              <th className="px-3 py-2 border">Size</th>
              <th className="px-3 py-2 border">Weight</th>
              <th className="px-3 py-2 border">Date</th>
              <th className="px-3 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((bag) => (
              <tr
                key={bag.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-3 py-2 border">{bag.id}</td>
                <td className="px-3 py-2 border">{bag.delivery_person}</td>
                <td className="px-3 py-2 border">{bag.delivery_recipient}</td>
                <td className="px-3 py-2 border">
                  {bag.harvest_room[0]?.name ?? '—'}
                </td>
                <td className="px-3 py-2 border">
                  {bag.strain[0]?.name ?? '—'}
                </td>
                <td className="px-3 py-2 border">
                  {bag.size[0]?.name ?? '—'}
                </td>
                <td className="px-3 py-2 border">{bag.weight}</td>
                <td className="px-3 py-2 border">
                  {new Date(bag.updated_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 border space-x-2 flex items-center">
                  {/* View QR */}
                  <button
                    onClick={() => openQr(bag.qr_code)}
                    className="text-blue-600 hover:text-blue-800"
                    title="View QR Code"
                  >
                    <FaQrcode />
                  </button>
                  {/* Edit delivery */}
                  <button
                    className="text-green-600 hover:text-green-800"
                    title="Edit Delivery"
                  >
                    <FaEdit />
                  </button>
                  {/* Check-in back to inventory */}
                  <button
                    className="text-yellow-600 hover:text-yellow-800"
                    title="Check Back In"
                  >
                    <FaTruck />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="p-4 text-center text-gray-500 dark:text-gray-400">
          No deliveries found.
        </p>
      )}

      {qrModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={closeQr}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={closeQr}
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
    </div>
  );
}