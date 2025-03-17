'use client';

import React, { useState } from 'react';
import { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';

const BAG_CATEGORIES = [
  'GREEN WASTE',
  'BUCKED',
  'FINAL TRIM',
  'BIGS',
  'SMALLS',
  'MICROS',
  'PT',
  'TRIM',
];

interface HarvestSummaryReportProps {
  inventoryBags: BagRecord[];
  serverHarvestRooms: HarvestRoom[];
  serverStrains: Strain[];
  serverBagSizes: BagSize[];
}

const HarvestSummaryReport: React.FC<HarvestSummaryReportProps> = ({
  inventoryBags,
  serverHarvestRooms,
  serverStrains,
  serverBagSizes,
}) => {
  // Sort harvest rooms in descending order (based on the numeric part of their name)
  const sortedHarvestRooms = [...serverHarvestRooms].sort((a, b) => {
    const numA = parseInt(a.name.replace(/[^\d]/g, ''), 10);
    const numB = parseInt(b.name.replace(/[^\d]/g, ''), 10);
    return numB - numA;
  });

  const defaultHarvestId = sortedHarvestRooms.length ? sortedHarvestRooms[0].id : '';
  const [selectedHarvestId, setSelectedHarvestId] = useState<string>(defaultHarvestId);

  const computeHarvestSummary = () => {
    if (!selectedHarvestId) return [];
    
    // Filter strains to include only those that belong to the selected harvest room.
    const associatedStrains = serverStrains.filter(
      (strain) => String(strain.harvest_room_id) === String(selectedHarvestId)
    );
    console.log('Associated Strains:', associatedStrains);

    // Filter bag records for the selected harvest.
    const filteredInventory = inventoryBags.filter(
      (bag) => String(bag.harvest_room_id) === String(selectedHarvestId)
    );

    // For each associated strain, compute the summary.
    const summaryData = associatedStrains.map((strain) => {
      const strainName = strain.name;
      
      // Get bag records for this strain (if any) in the selected harvest.
      const strainBags = filteredInventory.filter(
        (bag) => String(bag.strain_id) === String(strain.id)
      );
      
      // Initialize each bag category to 0.
      const categoryWeights: { [key: string]: number } = {};
      BAG_CATEGORIES.forEach((cat) => {
        categoryWeights[cat] = 0;
      });
      
      // Sum up the weights from available bag records.
      strainBags.forEach((bag) => {
        const bagSize = serverBagSizes.find(
          (bs) => String(bs.id) === String(bag.size_category_id)
        );
        if (bagSize) {
          const categoryName = bagSize.name.trim().toUpperCase();
          if (BAG_CATEGORIES.includes(categoryName)) {
            const weightValue =
              typeof bag.weight === 'number'
                ? bag.weight
                : parseFloat(bag.weight as string);
            if (!isNaN(weightValue)) {
              categoryWeights[categoryName] += weightValue;
            }
          }
        }
      });
      
      return { strainName, categoryWeights };
    });
    return summaryData;
  };

  const summaryData = computeHarvestSummary();

  return (
    <div>
      <div className="mb-4">
        <label className="mr-2">Select Harvest:</label>
        <select
          value={selectedHarvestId}
          onChange={(e) => setSelectedHarvestId(e.target.value)}
          className="border p-2"
        >
          {sortedHarvestRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </div>
      {summaryData.length === 0 ? (
        <p>No associated strains available for this harvest.</p>
      ) : (
        summaryData.map((data, idx) => (
          <div key={idx} className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-center">{data.strainName}</h2>
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  {BAG_CATEGORIES.map((category, i) => (
                    <th key={i} className="border border-gray-300 p-2">
                      {category}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {BAG_CATEGORIES.map((category, i) => (
                    <td key={i} className="border border-gray-300 p-2 text-center">
                      {data.categoryWeights[category].toFixed(3)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default HarvestSummaryReport;