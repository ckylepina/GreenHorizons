'use client';

import React from 'react';
import Image from 'next/image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { BagRecord, Strain, BagSize } from '@/components/bag-entry-form/types';

interface MenuProps {
  inventoryBags: BagRecord[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
}

interface GroupedData {
  strainName: string;
  countsBySize: Record<string, number>;
  total: number;
}

const Menu: React.FC<MenuProps> = ({
  inventoryBags,
  serverStrains,
  serverBagSizes,
}) => {
  // Define allowed sizes and their order.
  const allowedSizesOrder = ['Bigs', 'Smalls', 'Micros'];
  const allowedSizes = new Set(allowedSizesOrder);

  // Filter inventoryBags to only include those currently in inventory AND with an allowed size.
  const filteredBags = inventoryBags.filter((bag) => {
    // 1) Must be in_inventory
    if (bag.current_status !== 'in_inventory') return false;

    // 2) Must have an allowed size
    const size = serverBagSizes.find((s) => s.id === bag.size_category_id);
    return size !== undefined && allowedSizes.has(size.name);
  });

  // Group filtered inventory by strain name.
  const grouped: Record<string, GroupedData> = {};
  filteredBags.forEach((bag) => {
    const strain = serverStrains.find((s) => s.id === bag.strain_id);
    const strainName = strain ? strain.name : 'Unknown';
    const key = strainName.toLowerCase();

    const size = serverBagSizes.find((s) => s.id === bag.size_category_id);
    const sizeName = size ? size.name : 'Unknown';

    if (!grouped[key]) {
      grouped[key] = { strainName, countsBySize: {}, total: 0 };
    }
    grouped[key].total += 1;
    grouped[key].countsBySize[sizeName] = 
      (grouped[key].countsBySize[sizeName] || 0) + 1;
  });
  const groupedArray = Object.values(grouped);

  // Grand totals per size + overall total
  const grandTotals: Record<string, number> = {};
  groupedArray.forEach((group) => {
    allowedSizesOrder.forEach((sizeName) => {
      grandTotals[sizeName] = 
        (grandTotals[sizeName] || 0) + (group.countsBySize[sizeName] || 0);
    });
  });
  const grandTotalAll = groupedArray.reduce((sum, g) => sum + g.total, 0);

  // PDF export function
  const handleExportPdf = async () => {
    const element = document.getElementById('menu-container');
    if (!element) return;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('menu.pdf');
  };

  return (
    <div className="bg-green-500 p-4 rounded shadow mb-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center bg-green-600 p-2 rounded mb-4">
        <h2 className="text-xl font-bold">Menu</h2>
        <Image
          src="/greenhorizonsicon white.png"
          alt="Green Horizons Icon"
          width={175}
          height={175}
          className="object-contain"
          unoptimized
          style={{ filter: 'drop-shadow(0 0 2px white)' }}
        />
      </div>

      {/* Table container */}
      <div id="menu-container">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="p-2 text-left text-white text-sm md:text-base">Strain</th>
              {allowedSizesOrder.map((sizeName) => (
                <th
                  key={sizeName}
                  className="p-2 text-center text-white text-sm md:text-base"
                >
                  {sizeName}
                </th>
              ))}
              <th className="p-2 text-center text-white text-sm md:text-base">Total</th>
            </tr>
          </thead>
          <tbody>
            {groupedArray.map((group, idx) => (
              <tr key={idx}>
                <td className="p-2 text-white text-sm md:text-base">{group.strainName}</td>
                {allowedSizesOrder.map((sizeName) => (
                  <td
                    key={sizeName}
                    className="p-2 text-center text-white text-sm md:text-base"
                  >
                    {group.countsBySize[sizeName] || 0}
                  </td>
                ))}
                <td className="p-2 text-center font-bold text-white text-sm md:text-base">
                  {group.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="p-2 font-bold text-white text-sm md:text-base">Grand Total</td>
              {allowedSizesOrder.map((sizeName) => (
                <td
                  key={sizeName}
                  className="p-2 text-center font-bold text-white text-sm md:text-base"
                >
                  {grandTotals[sizeName] || 0}
                </td>
              ))}
              <td className="p-2 text-center font-bold text-white text-sm md:text-base">
                {grandTotalAll}
              </td>
            </tr>
            <tr>
              <td
                colSpan={allowedSizesOrder.length + 2}
                className="p-2 text-center font-bold bg-green-600 text-white text-sm md:text-base"
              >
                Overall Total Items: {grandTotalAll}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* PDF export */}
      <div className="mt-4 text-right">
        <button
          onClick={handleExportPdf}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm md:text-base"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default Menu;