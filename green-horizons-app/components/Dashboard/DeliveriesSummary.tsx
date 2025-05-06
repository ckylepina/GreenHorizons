// components/Dashboard/DeliveriesSummary.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { FaChevronDown, FaChevronUp, FaQrcode, FaTimes } from 'react-icons/fa';
import { useQRCode } from 'next-qrcode';

export interface DeliveredBag {
  id:                 string;
  qr_code:            string;
  delivery_person:    string;
  delivery_recipient: string;
  updated_at:         string;
  weight:             number;
  harvest_room?:      { name: string } | { name: string }[];
  strain?:            { name: string } | { name: string }[];
  size?:              { name: string } | { name: string }[];
}

interface DeliveriesSummaryProps {
  data: DeliveredBag[];
}

interface RecipientGroup {
  recipient: string;
  bags:       DeliveredBag[];
}

interface TypeGroup {
  key:        string;
  strainName: string;
  sizeName:   string;
  bags:       DeliveredBag[];
}

export default function DeliveriesSummary({ data }: DeliveriesSummaryProps) {
  const [expandedRecipients, setExpandedRecipients] = useState<Record<string, boolean>>({});
  const [expandedTypes, setExpandedTypes]           = useState<Record<string, boolean>>({});
  const [qrModal, setQrModal]                       = useState<{ open: boolean; text: string }>({
    open: false,
    text: '',
  });
  const { Image: QRImage } = useQRCode();

  function extractName(field?: { name: string } | { name: string }[]) {
    if (!field) return undefined;
    return Array.isArray(field) ? field[0]?.name : field.name;
  }

  // 1) Group by recipient
  const recipientGroups: RecipientGroup[] = useMemo(() => {
    const map: Record<string, RecipientGroup> = {};
    data.forEach(bag => {
      const rec = bag.delivery_recipient || '—';
      if (!map[rec]) map[rec] = { recipient: rec, bags: [] };
      map[rec].bags.push(bag);
    });
    return Object.values(map);
  }, [data]);

  // 2) Within each recipient, group by strain–size
  function makeTypeGroups(bags: DeliveredBag[]): TypeGroup[] {
    const map: Record<string, TypeGroup> = {};
    bags.forEach(bag => {
      const strain = extractName(bag.strain) ?? 'Unknown';
      const size   = extractName(bag.size)   ?? 'Unknown';
      const key    = `${strain}—${size}`;
      if (!map[key]) {
        map[key] = { key, strainName: strain, sizeName: size, bags: [] };
      }
      map[key].bags.push(bag);
    });
    return Object.values(map);
  }

  return (
    <div className="space-y-6">
      {recipientGroups.map(grp => {
        const recKey = grp.recipient;
        const openRec = !!expandedRecipients[recKey];
        // assume all in this group have same delivery_person:
        const deliveredBy = grp.bags[0]?.delivery_person || '—';

        return (
          <div key={recKey} className="border rounded">
            <div
              className="p-4 flex justify-between items-center cursor-pointer bg-gray-50 dark:bg-gray-700"
              onClick={() =>
                setExpandedRecipients(e => ({ ...e, [recKey]: !openRec }))
              }
            >
              <div>
                <p className="text-lg font-semibold">
                  Delivered To: {grp.recipient}
                </p>
                <p className="text-sm">
                  By: {deliveredBy}
                </p>
                <p className="text-sm">
                  {grp.bags.length} bag(s)
                </p>
              </div>
              {openRec ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            {openRec && (
              <div className="p-4 space-y-4">
                {makeTypeGroups(grp.bags).map(tg => {
                  const typeKey = `${recKey}|${tg.key}`;
                  const openType = !!expandedTypes[typeKey];
                  return (
                    <div key={typeKey} className="border rounded">
                      <div
                        className="p-3 flex justify-between items-center bg-gray-100 dark:bg-gray-800 cursor-pointer"
                        onClick={() =>
                          setExpandedTypes(e => ({ ...e, [typeKey]: !openType }))
                        }
                      >
                        <div>
                          <p>
                            <strong>{tg.strainName}</strong> — {tg.sizeName}
                          </p>
                          <p className="text-sm">
                            {tg.bags.length} bag(s),{' '}
                            {tg.bags.reduce((sum, b) => sum + b.weight, 0).toFixed(2)} lbs
                          </p>
                        </div>
                        {openType ? <FaChevronUp /> : <FaChevronDown />}
                      </div>

                      {openType && (
                        <div className="p-3 overflow-x-auto bg-white dark:bg-gray-900">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr>
                                <th className="border px-2 py-1">Bag ID</th>
                                <th className="border px-2 py-1">Harvest</th>
                                <th className="border px-2 py-1">Weight</th>
                                <th className="border px-2 py-1">Date</th>
                                <th className="border px-2 py-1">QR Code</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tg.bags.map(bag => {
                                const harvestName = extractName(bag.harvest_room);
                                return (
                                  <tr
                                    key={bag.id}
                                    className="border-b hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <td className="px-2 py-1">{bag.id}</td>
                                    <td className="px-2 py-1">
                                      {harvestName ? `H${harvestName}` : '—'}
                                    </td>
                                    <td className="px-2 py-1">
                                      {bag.weight.toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1">
                                      {new Date(bag.updated_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-2 py-1 text-center">
                                      <button
                                        onClick={() =>
                                          setQrModal({ open: true, text: bag.id })
                                        }
                                        className="text-blue-600 hover:text-blue-800"
                                        title="View QR"
                                      >
                                        <FaQrcode />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {qrModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setQrModal({ open: false, text: '' })}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg relative"
            onClick={e => e.stopPropagation()}
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
    </div>
  );
}