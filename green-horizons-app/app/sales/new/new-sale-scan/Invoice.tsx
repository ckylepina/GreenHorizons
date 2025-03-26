'use client';

import React, { useEffect, useMemo } from 'react';
import Image from 'next/image';
import type { BagRecord, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

export type InvoiceData = {
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    business_name?: string;
    license_number?: string;
    phone?: string;
  };
  scannedBags: BagRecord[];
  saleTotal: number;
  date: string;
};

interface InvoiceProps {
  invoiceData: InvoiceData;
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

interface GroupedBag {
  key: string;
  harvest_room_id: string | null;
  strain_id: string | null;
  size_category_id: string | null;
  weight: number;
  bags: BagRecord[];
}

function groupBags(bags: BagRecord[]): GroupedBag[] {
  const groupsMap: Record<string, GroupedBag> = {};
  bags.forEach((bag) => {
    const key = `${bag.harvest_room_id ?? 'none'}_${bag.strain_id ?? 'none'}_${bag.size_category_id ?? 'none'}_${bag.weight}`;
    if (!groupsMap[key]) {
      groupsMap[key] = {
        key,
        harvest_room_id: bag.harvest_room_id,
        strain_id: bag.strain_id,
        size_category_id: bag.size_category_id,
        weight: bag.weight,
        bags: [],
      };
    }
    groupsMap[key].bags.push(bag);
  });
  return Object.values(groupsMap);
}

const Invoice: React.FC<InvoiceProps> = ({
  invoiceData,
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}) => {
  // Debug logging of invoice data.
  useEffect(() => {
    console.log("Invoice Data:", invoiceData);
    console.log("Customer Details:", invoiceData.customer);
  }, [invoiceData]);

  const groups = useMemo(() => groupBags(invoiceData.scannedBags), [invoiceData.scannedBags]);
  const pricePerBag = invoiceData.saleTotal / invoiceData.scannedBags.length;

  const getStrainName = (id?: string | null) =>
    initialStrains.find((s) => s.id === id)?.name || 'Unknown';
  const getHarvestRoomName = (id?: string | null) =>
    initialHarvestRooms.find((r) => r.id === id)?.name || 'Unknown';
  const getBagSizeName = (id?: string | null) =>
    initialBagSizes.find((b) => b.id === id)?.name || 'Unknown';

  // Function to open a new window for printing only the invoice content.
  const handlePrintInvoice = () => {
    const invoiceContent = document.getElementById("invoice-content");
    if (!invoiceContent) return;
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Invoice</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: sans-serif;
            }
            h1, h2, h3, p, table {
              margin: 0 0 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px 8px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          ${invoiceContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white">
      {/* Invoice content wrapper */}
      <div id="invoice-content">
        {/* Header: Invoice title on the left, logo on the right */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Invoice</h1>
          <Image
            src="/greenhorizonsicon.png"
            alt="Green Horizons Icon"
            width={250}
            height={250}
            unoptimized
            className="bg-white p-2 rounded"
          />
        </div>
        
        {/* Sale Date */}
        <div className="mb-4">
          <p className="text-sm">Date: {new Date(invoiceData.date).toLocaleDateString()}</p>
        </div>

        {/* Customer Details */}
        <div className="border p-4 rounded mb-8">
          <h2 className="text-xl font-semibold mb-2">Billed To:</h2>
          <p className="font-bold">
            {invoiceData.customer.business_name
              ? invoiceData.customer.business_name
              : `${invoiceData.customer.first_name} ${invoiceData.customer.last_name}`}
          </p>
          <p>Email: {invoiceData.customer.email}</p>
          <p>Phone: {invoiceData.customer.phone}</p>
        </div>

        {/* Sale Items Table */}
        <div className="border p-4 rounded mb-8">
          <h2 className="text-xl font-semibold mb-2">Sale Items</h2>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="border p-2">Harvest Room</th>
                <th className="border p-2">Strain</th>
                <th className="border p-2">Bag Size</th>
                <th className="border p-2">Weight</th>
                <th className="border p-2">Items</th>
                <th className="border p-2">Price per Bag</th>
                <th className="border p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.key}>
                  <td className="border p-2">{getHarvestRoomName(group.harvest_room_id)}</td>
                  <td className="border p-2">{getStrainName(group.strain_id)}</td>
                  <td className="border p-2">{getBagSizeName(group.size_category_id)}</td>
                  <td className="border p-2">{group.weight}</td>
                  <td className="border p-2">{group.bags.length}</td>
                  <td className="border p-2">${pricePerBag.toFixed(2)}</td>
                  <td className="border p-2">${(pricePerBag * group.bags.length).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Total */}
        <div className="text-right mb-8">
          <p className="text-2xl font-bold">Invoice Total: ${invoiceData.saleTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="text-center">
        <button
          onClick={handlePrintInvoice}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Print Invoice
        </button>
      </div>
    </div>
  );
};

export default Invoice;