'use client';

import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaQrcode, FaEdit, FaTruck, FaTimes } from 'react-icons/fa';
import { useQRCode } from 'next-qrcode';
import { DeliveredBag } from './DeliveriesSummary';
/**
 * The shape of each delivered‐bag record, joined with names:
 */

export interface GroupedDelivery {
  key:            string;
  harvestName:    string;
  strainName:     string;
  sizeName:       string;
  count:          number;
  totalWeight:    number;
  bags:           DeliveredBag[];
}

interface DeliveriesGroupProps {
  group: GroupedDelivery;
  onEditDelivery: (bagId: string) => void;
  onCheckIn: (bagId: string) => void;
}

export const DeliveriesGroup: React.FC<DeliveriesGroupProps> = ({
  group,
  onEditDelivery,
  onCheckIn,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; text: string }>({
    open: false,
    text: '',
  });
  const { Image: QRImage } = useQRCode();

  const openQr = (text: string) => setQrModal({ open: true, text });
  const closeQr = () => setQrModal({ open: false, text: '' });

  return (
    <>
      <div className="border rounded mb-4 bg-white dark:bg-gray-800">
        <button
          className="w-full p-4 flex justify-between items-center"
          onClick={() => setExpanded(e => !e)}
        >
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {group.strainName} – {group.sizeName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Room: {group.harvestName} | {group.count} bag(s) | Total Weight:{' '}
              {group.totalWeight.toFixed(2)} lbs
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
                  <th className="border px-2 py-1">Delivered By</th>
                  <th className="border px-2 py-1">Delivered To</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">QR</th>
                  <th className="border px-2 py-1">Edit</th>
                  <th className="border px-2 py-1">Check-In</th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map(bag => (
                  <tr
                    key={bag.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="border px-2 py-1 text-gray-800 dark:text-gray-200">
                      {bag.id}
                    </td>
                    <td className="border px-2 py-1">{bag.delivery_person}</td>
                    <td className="border px-2 py-1">{bag.delivery_recipient}</td>
                    <td className="border px-2 py-1">
                      {new Date(bag.updated_at).toLocaleDateString()}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() => openQr(bag.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View QR Code"
                      >
                        <FaQrcode />
                      </button>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() => onEditDelivery(bag.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Edit Delivery"
                      >
                        <FaEdit />
                      </button>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() => onCheckIn(bag.id)}
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
          </div>
        )}
      </div>

      {qrModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={closeQr}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg relative"
            onClick={e => e.stopPropagation()}
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
    </>
  );
};