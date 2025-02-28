'use client';

import React from 'react';
import { useQRCode } from 'next-qrcode';
import { BagRecord, Strain, BagSize, HarvestRoom } from './types';

interface LabelsToPrintProps {
  bags?: BagRecord[];
  serverStrains?: Strain[];
  serverBagSizes?: BagSize[];
  serverHarvestRooms?: HarvestRoom[];
}

export default function LabelsToPrint({
  bags = [],
  serverStrains = [],
  serverBagSizes = [],
  serverHarvestRooms = [],
}: LabelsToPrintProps) {
  const { Image: QRImage } = useQRCode();

  // Update parameter types to accept string or null.
  const getStrainName = (id?: string | null) =>
    serverStrains.find((s) => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    serverHarvestRooms.find((r) => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    serverBagSizes.find((b) => b.id === id)?.name || 'Unknown';

  if (bags.length === 0) {
    return <p className="text-xs">No bags available.</p>;
  }

  return (
    <>
      {/* Global print styles */}
      <style jsx global>{`
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
            -webkit-column-break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-labels > .label:last-child {
            page-break-after: auto !important;
          }
        }
      `}</style>

      <div id="printable-area" className="printable-labels">
        {bags.map((bag) => (
          <div
            key={bag.id}
            className="label inline-block m-0 p-0"
            style={{
              width: '3.5in', // Fixed label width
              height: '1in',  // Fixed label height
              overflow: 'hidden',
              boxSizing: 'border-box',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}
          >
            {/* Scaling wrapper with a slight top offset */}
            <div
              style={{
                transform: 'scale(0.95) translateY(0.04in)',
                transformOrigin: 'top left',
                width: '100%',
                height: '100%',
              }}
            >
              <table
                className="w-full h-full"
                style={{
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                  margin: 0,
                  padding: 0,
                }}
              >
                <tbody>
                  <tr style={{ height: '100%' }}>
                    {/* Left cell: bag details arranged in two lines */}
                    <td
                      style={{
                        width: '71%',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '0.02in',
                        paddingTop: '0.06in',
                        fontSize: '1rem',
                        lineHeight: '1.2',
                      }}
                    >
                      <div>
                        {getStrainName(bag.strain_id)} {getHarvestRoomName(bag.harvest_room_id)}
                      </div>
                      <div>
                        {getBagSizeName(bag.size_category_id)} {bag.weight ?? 0}lbs
                      </div>
                    </td>
                    {/* Right cell: QR Code */}
                    <td
                      style={{
                        width: '29%',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        padding: '0.02in 0.04in 0.02in 0.02in',
                      }}
                    >
                      {bag.qr_code ? (
                        <QRImage text={bag.qr_code} options={{ scale: 25 }} />
                      ) : (
                        <span style={{ fontSize: '1rem' }}>No QR Code</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}