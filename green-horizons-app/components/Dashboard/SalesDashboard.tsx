'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { DashboardSalesData } from '@/app/types/dashboard'; // Adjust path as needed

interface SalesDashboardProps {
  salesData: DashboardSalesData[];
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ salesData }) => {
  const chartData = {
    labels: salesData.map((sale) => sale.date),
    datasets: [
      {
        label: 'Sales Total',
        data: salesData.map((sale) => sale.total),
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.3)',
      },
    ],
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Sales Overview</h2>
      <div className="mb-6">
        <Line data={chartData} />
      </div>
      <div>
        <h3 className="text-xl font-semibold">Sales Details</h3>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map((sale, index) => (
              <tr key={index}>
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

export default SalesDashboard;