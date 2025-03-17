'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

interface SalesData {
  date: string;
  total: number;
  // add other fields if needed
}

interface ChiefOfOperationsDashboardProps {
  salesData: SalesData[];
}

const ChiefOfOperationsDashboard: React.FC<ChiefOfOperationsDashboardProps> = ({ salesData }) => {
  // Prepare chart data for a simple line chart
  const chartData = {
    labels: salesData.map((sale) => sale.date),
    datasets: [
      {
        label: 'Total Sales',
        data: salesData.map((sale) => sale.total),
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.2)',
      },
    ],
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Chief Of Operations Dashboard</h1>
      <div className="mb-6">
        <Line data={chartData} />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Sales Details</h2>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map((sale, idx) => (
              <tr key={idx}>
                <td className="border border-gray-300 p-2">{sale.date}</td>
                <td className="border border-gray-300 p-2">{sale.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChiefOfOperationsDashboard;