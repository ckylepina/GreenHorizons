'use client';

import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { useTheme } from 'next-themes';

export interface SalesData {
  id: string;
  tenant_id: string;
  customer_id: string;
  sale_date: string;
  total_amount: number;
  cash_transaction_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    business_name?: string | null;
  } | null;
}

interface SalesOverviewProps {
  salesData?: SalesData[];
}

const SalesOverview: React.FC<SalesOverviewProps> = ({ salesData = [] }) => {
  const { theme } = useTheme();

  // Daily Sales Chart Data (Line Chart)
  const dailyChartData = {
    labels: salesData.map((sale) => sale.sale_date),
    datasets: [
      {
        label: 'Total Sales',
        data: salesData.map((sale) => sale.total_amount),
        borderColor: theme === 'dark' ? '#4f8cff' : 'blue',
        backgroundColor: theme === 'dark' ? 'rgba(79,140,255,0.2)' : 'rgba(0, 0, 255, 0.2)',
      },
    ],
  };

  const dailyChartOptions = {
    plugins: {
      legend: {
        labels: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
      },
    },
  };

  // Overall Sales Summary
  const totalSalesCollection = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalSalesCount = salesData.length;
  const averageSale = totalSalesCount > 0 ? totalSalesCollection / totalSalesCount : 0;

  // Aggregate sales by month for Monthly Sales Chart (Bar Chart)
  const monthlyData = salesData.reduce((acc, sale) => {
    const date = new Date(sale.sale_date);
    if (isNaN(date.getTime())) return acc;
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = { totalSales: 0, count: 0 };
    }
    acc[monthKey].totalSales += sale.total_amount;
    acc[monthKey].count += 1;
    return acc;
  }, {} as Record<string, { totalSales: number; count: number }>);

  const monthlyLabels = Object.keys(monthlyData).sort();
  const monthlySalesAmounts = monthlyLabels.map((label) => monthlyData[label].totalSales);

  const monthlyChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Monthly Total Sales',
        data: monthlySalesAmounts,
        backgroundColor: theme === 'dark' ? 'rgba(79,140,255,0.6)' : 'rgba(0,0,255,0.6)',
        borderColor: theme === 'dark' ? '#4f8cff' : 'blue',
        borderWidth: 1,
      },
    ],
  };

  const monthlyChartOptions = {
    plugins: {
      legend: {
        labels: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#ffffff' : '#000000',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
      },
    },
  };

  // Latest Sales: sort by sale_date descending and take the top 5
  const latestSales = [...salesData]
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, 5);

  // Top Customers: aggregate sales by customer_id
  const customerAggregation: Record<
    string,
    { customer: SalesData['customer']; totalSales: number; count: number }
  > = {};
  salesData.forEach((sale) => {
    if (!sale.customer) return;
    const customerId = sale.customer_id;
    if (!customerAggregation[customerId]) {
      customerAggregation[customerId] = { customer: sale.customer, totalSales: 0, count: 0 };
    }
    customerAggregation[customerId].totalSales += sale.total_amount;
    customerAggregation[customerId].count += 1;
  });
  const topCustomers = Object.entries(customerAggregation)
    .map(([customerId, agg]) => ({ customerId, ...agg }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  // Helper to display customer name
  const getCustomerName = (customer: SalesData['customer']) => {
    if (!customer) return 'Unknown';
    if (customer.business_name) return customer.business_name;
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  return (
    <div className="p-4 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Sales Overview</h2>

      {/* Overall Sales Summary */}
      <div className="p-4 rounded shadow mb-6">
        <h3 className="text-xl font-semibold mb-2">Overall Sales Summary</h3>
        <p>Total Sales Collection: ${totalSalesCollection.toFixed(2)}</p>
        <p>Total Number of Sales: {totalSalesCount}</p>
        <p>Average Sale Amount: ${averageSale.toFixed(2)}</p>
      </div>

      {/* Daily Sales Chart */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Daily Sales</h3>
        <Line data={dailyChartData} options={dailyChartOptions} />
      </div>

      {/* Monthly Sales Chart */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Monthly Sales Summary</h3>
        <Bar data={monthlyChartData} options={monthlyChartOptions} />
      </div>

      {/* Latest Sales List */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Latest Sales</h3>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Customer</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {latestSales.map((sale) => (
              <tr key={sale.id}>
                <td className="border border-gray-300 p-2">{sale.sale_date}</td>
                <td className="border border-gray-300 p-2">{getCustomerName(sale.customer)}</td>
                <td className="border border-gray-300 p-2">${sale.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Customers List */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Top Customers</h3>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Customer</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
              <th className="border border-gray-300 p-2">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((customerData) => (
              <tr key={customerData.customerId}>
                <td className="border border-gray-300 p-2">{getCustomerName(customerData.customer)}</td>
                <td className="border border-gray-300 p-2">${customerData.totalSales.toFixed(2)}</td>
                <td className="border border-gray-300 p-2">{customerData.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Sales Table */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Sales Details</h3>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Customer</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
              {/* Add more columns as needed */}
            </tr>
          </thead>
          <tbody>
            {salesData.map((sale) => (
              <tr key={sale.id}>
                <td className="border border-gray-300 p-2">{sale.sale_date}</td>
                <td className="border border-gray-300 p-2">{getCustomerName(sale.customer)}</td>
                <td className="border border-gray-300 p-2">${sale.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesOverview;