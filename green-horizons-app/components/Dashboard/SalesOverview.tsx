'use client';

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useTheme } from 'next-themes';
import Invoice from '@/app/sales/new/new-sale-scan/Invoice';
import { Strain, BagSize, HarvestRoom, BagRecord } from '@/components/bag-entry-form/types';

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
    email?: string | null;
    license_number?: string | null;
    phone?: string | null;
  } | null;
  // Updated scannedBags type to BagRecord[] instead of string[]
  scannedBags?: BagRecord[];
  item_count?: number;
}

interface SalesOverviewProps {
  salesData?: SalesData[];
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
}

const SalesOverview: React.FC<SalesOverviewProps> = ({
  salesData = [],
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
}) => {
  const { theme } = useTheme();
  const [selectedSale, setSelectedSale] = useState<SalesData | null>(null);

  // Helper to format sale date.
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Daily Sales Chart Data (Line Chart)
  const dailyChartData = {
    labels: salesData.map(sale => formatDate(sale.sale_date)),
    datasets: [
      {
        label: 'Total Sales',
        data: salesData.map(sale => sale.total_amount),
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

  // Latest Sales: sort by sale_date descending and take the top 5.
  const latestSales = [...salesData]
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, 5);

  // Top Customers: aggregate sales by customer_id.
  const customerAggregation: Record<
    string,
    { customer: SalesData['customer']; totalSales: number; count: number }
  > = {};
  salesData.forEach(sale => {
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

      {/* Latest Sales List */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Latest Sales</h3>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Date</th>
              <th className="border border-gray-300 p-2">Customer</th>
              <th className="border border-gray-300 p-2">Items</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
              <th className="border border-gray-300 p-2">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {latestSales.map(sale => (
              <tr key={sale.id}>
                <td className="border border-gray-300 p-2">{formatDate(sale.sale_date)}</td>
                <td className="border border-gray-300 p-2">{getCustomerName(sale.customer)}</td>
                <td className="border border-gray-300 p-2">{sale.item_count || '-'}</td>
                <td className="border border-gray-300 p-2">${sale.total_amount.toFixed(2)}</td>
                <td className="border border-gray-300 p-2">
                  <button
                    onClick={() => setSelectedSale(sale)}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    View Invoice
                  </button>
                </td>
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
              <th className="border border-gray-300 p-2">Purchases</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.map(customerData => (
              <tr key={customerData.customerId}>
                <td className="border border-gray-300 p-2">{getCustomerName(customerData.customer)}</td>
                <td className="border border-gray-300 p-2">{customerData.count}</td>
                <td className="border border-gray-300 p-2">${customerData.totalSales.toFixed(2)}</td>
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
              <th className="border border-gray-300 p-2">Items</th>
              <th className="border border-gray-300 p-2">Customer</th>
              <th className="border border-gray-300 p-2">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map(sale => (
              <tr key={sale.id}>
                <td className="border border-gray-300 p-2">{formatDate(sale.sale_date)}</td>
                <td className="border border-gray-300 p-2">{sale.item_count || '-'}</td>
                <td className="border border-gray-300 p-2">{getCustomerName(sale.customer)}</td>
                <td className="border border-gray-300 p-2">${sale.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-2">
            Invoice for Sale {selectedSale.id}
          </h3>
          <Invoice
            invoiceData={{
              customer: {
                first_name: selectedSale.customer?.first_name ?? '',
                last_name: selectedSale.customer?.last_name ?? '',
                email: selectedSale.customer?.email ?? '',
                business_name: selectedSale.customer?.business_name ?? '',
                license_number: selectedSale.customer?.license_number ?? '',
                phone: selectedSale.customer?.phone ?? '',
              },
              // Now scannedBags is expected to be a BagRecord[]
              scannedBags: selectedSale.scannedBags || [],
              saleTotal: selectedSale.total_amount,
              date: selectedSale.sale_date,
            }}
            initialStrains={initialStrains}
            initialBagSizes={initialBagSizes}
            initialHarvestRooms={initialHarvestRooms}
          />
          <button
            onClick={() => window.print()}
            className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
          >
            Print Invoice
          </button>
        </div>
      )}
    </div>
  );
};

export default SalesOverview;