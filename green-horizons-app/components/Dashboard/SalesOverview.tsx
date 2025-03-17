'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useTheme } from 'next-themes';

export interface SalesData {
  sale_date: string;
  total_amount: number;
  // Add other fields as needed
}

interface SalesOverviewProps {
  salesData?: SalesData[];
}

const SalesOverview: React.FC<SalesOverviewProps> = ({ salesData = [] }) => {
  // Get the current theme from next-themes.
  const { theme } = useTheme();

  // Prepare chart data.
  const chartData = {
    labels: salesData.map((sale) => sale.sale_date),
    datasets: [
      {
        label: 'Total Sales',
        data: salesData.map((sale) => sale.total_amount),
        borderColor: theme === 'dark' ? '#4f8cff' : 'blue', // Slightly different blue for dark mode
        backgroundColor: theme === 'dark' ? 'rgba(79,140,255,0.2)' : 'rgba(0, 0, 255, 0.2)',
      },
    ],
  };

  // Configure chart options for readability in both modes.
  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: theme === 'dark' ? '#ffffff' : '#000000', // Legend text color
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000', // X-axis tick color
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', // X-axis grid lines
        },
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000', // Y-axis tick color
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', // Y-axis grid lines
        },
      },
    },
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Sales Overview</h2>
      <div className="mb-6">
        <Line data={chartData} options={chartOptions} />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">Sales Details</h3>
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
                <td className="border border-gray-300 p-2">{sale.sale_date}</td>
                <td className="border border-gray-300 p-2">{sale.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Future enhancements:
          - Add filters (e.g., by date, product, region)
          - Export options (CSV, PDF)
          - Detailed views for individual sales */}
    </div>
  );
};

export default SalesOverview;