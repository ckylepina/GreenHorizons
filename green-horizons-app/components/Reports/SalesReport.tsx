'use client';

import React from 'react';
import SalesOverview, { SalesData } from '@/components/Dashboard/SalesOverview';
import { Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

interface SalesReportsProps {
  serverSalesData: SalesData[];
  initialStrains?: Strain[];
  initialBagSizes?: BagSize[];
  initialHarvestRooms?: HarvestRoom[];
}

const SalesReports: React.FC<SalesReportsProps> = ({
  serverSalesData,
  initialStrains = [],
  initialBagSizes = [],
  initialHarvestRooms = [],
}) => {
  return (
    <div>
      <SalesOverview
        salesData={serverSalesData}
        initialStrains={initialStrains}
        initialBagSizes={initialBagSizes}
        initialHarvestRooms={initialHarvestRooms}
      />
    </div>
  );
};

export default SalesReports;