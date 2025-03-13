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
            page-break-inside: avoid;
            break-inside: avoid;
            border: none !important;
          }
        }
      `}</style>

      <div className="printable-labels">
        {bags.map((bag) => (
          <div
            key={bag.id}
            className="label"
            style={{
              width: '3.5in',
              height: '1.1in',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              boxSizing: 'border-box',
              padding: '0.3in',
              margin: '0 auto',
              border: '1px solid #000', // Screen preview only
            }}
          >
            {/* Left side: Information */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'left',
                fontSize: '9pt',
                fontWeight: 'Bold',
                lineHeight: '1.5',
                paddingRight: '0.05in',
              }}
            >
              <div>
                {getHarvestRoomName(bag.harvest_room_id)}
              </div>
              <div>
                {getStrainName(bag.strain_id)}
              </div>
              <div>
                {getBagSizeName(bag.size_category_id)}
              </div>
              <div>
              {bag.weight}lbs
              </div>
            </div>
            {/* Right side: QR Code */}
            <div
              style={{
                width: '1in',
                height: '1in',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: 'scale(1.5)',
                transformOrigin: 'center',
              }}
            >
              {bag.qr_code ? (
                <QRImage text={bag.qr_code} options={{ scale: 1 }} />
              ) : (
                <span style={{ fontSize: '8pt' }}>No QR Code</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}