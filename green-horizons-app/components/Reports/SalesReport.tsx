'use client';

import React from 'react';
import SalesOverview, { SalesData } from '@/components/Dashboard/SalesOverview';

interface SalesReportsProps {
  serverSalesData: SalesData[];
}

const SalesReports: React.FC<SalesReportsProps> = ({ serverSalesData }) => {
  return (
    <div>
      <SalesOverview salesData={serverSalesData} />
    </div>
  );
};

export default SalesReports;