'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

// Define the type of a sales record (adjust fields as needed)
interface SalesRecord {
  date: string;
  actual: number;
  forecast: number;
  inflow: number;
  outflow: number;
  otherFinancial: number;
}

interface CEODashboardProps {
  salesData: SalesRecord[];
}

// Colors for the Cash Forecasting donut chart.
const donutColors: { [key: string]: string } = {
  Inflow: '#3182ce',
  Outflow: '#e53e3e',
  'Other Financial': '#805ad5',
};

// --------------------------------------------------
// Cash Forecasting Component (with hydration fix)
// --------------------------------------------------
function CashForecasting({ salesData }: CEODashboardProps) {
  const [bucket, setBucket] = useState<'D' | 'W' | 'M'>('D');
  const [metric, setMetric] = useState<'1W' | '1M' | '3M' | '6M' | '12M'>('1W');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastUpdated = mounted ? new Date().toLocaleDateString() : '';

  const cashflowData = salesData.map((record) => ({
    date: record.date,
    actual: record.actual,
    forecast: record.forecast,
  }));

  const totalInflow = salesData.reduce((sum, rec) => sum + rec.inflow, 0);
  const totalOutflow = salesData.reduce((sum, rec) => sum + rec.outflow, 0);
  const totalOtherFinancial = salesData.reduce((sum, rec) => sum + rec.otherFinancial, 0);

  const cashflowDonutData = [
    { name: 'Inflow', value: totalInflow },
    { name: 'Outflow', value: totalOutflow },
    { name: 'Other Financial', value: totalOtherFinancial },
  ];

  const inflowData = [
    { category: 'ACCOUNT RECEIVABLES', value: totalInflow * 0.5 },
    { category: 'ROYALTIES', value: totalInflow * 0.2 },
    { category: 'COMMISSIONS', value: totalInflow * 0.1 },
    { category: 'TAX REFUND', value: totalInflow * 0.1 },
    { category: 'INTEREST RECEIPTS', value: totalInflow * 0.1 },
  ];

  const outflowData = [
    { category: 'ACCOUNT PAYABLES', value: totalOutflow * 0.4 },
    { category: 'PAYROLL', value: totalOutflow * 0.3 },
    { category: 'TAX PAYMENTS', value: totalOutflow * 0.1 },
    { category: 'CAPEX', value: totalOutflow * 0.1 },
    { category: 'RENT/ADMIN CHARGES', value: totalOutflow * 0.05 },
    { category: 'INTEREST PAYMENTS', value: totalOutflow * 0.05 },
  ];

  const varianceData = {
    maximum: { price: '$120,000', percentage: '12%', measuredOn: '2025-02-15' },
    minimum: { price: '$80,000', percentage: '-5%', measuredOn: '2025-02-15' },
    average: { price: '$100,000', percentage: '3%', measuredOn: '2025-02-15' },
  };

  return (
    <div className="p-8 space-y-8">
      {/* Forecast Accuracy Section */}
      <section className="shadow p-4 rounded">
        <h1 className="text-3xl font-bold mb-2">Forecast Accuracy</h1>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
          <div>
            <strong>Bucket:</strong>
            <div className="mt-1 space-x-2">
              {(['D', 'W', 'M'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setBucket(option)}
                  className={`px-3 py-1 border rounded ${
                    bucket === option ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <strong>Metrics:</strong>
            <div className="mt-1 space-x-2">
              {(['1W', '1M', '3M', '6M', '12M'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setMetric(option)}
                  className={`px-3 py-1 border rounded ${
                    metric === option ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <strong>Last Updated:</strong> {lastUpdated}
          </div>
        </div>
      </section>

      {/* Net Cashflow Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Net Cashflow - Past 30 Days</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashflowData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#8884d8" name="Actual" />
              <Line type="monotone" dataKey="forecast" stroke="#82ca9d" name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Net Cashflow</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={cashflowDonutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                label
              >
                {cashflowDonutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={donutColors[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-around">
            <div className="text-blue-500 text-center">
              <strong>Inflow</strong>
              <p className="text-sm">AR, others, tax receivables</p>
            </div>
            <div className="text-red-500 text-center">
              <strong>Outflow</strong>
              <p className="text-sm">Payroll, AP, others</p>
            </div>
            <div className="text-purple-500 text-center">
              <strong>Other Financial</strong>
              <p className="text-sm">Borrowings, others</p>
            </div>
          </div>
        </div>
      </section>

      {/* Inflows and Outflows Bar Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Inflows</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inflowData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3182ce" name="Inflows" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Outflows</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={outflowData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#e53e3e" name="Outflows" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Variance Sections */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="shadow p-4 rounded text-center">
          <h2 className="text-xl font-semibold">Maximum Variance</h2>
          <p className="text-2xl font-bold">{varianceData.maximum.price}</p>
          <p className="text-lg">{varianceData.maximum.percentage}</p>
          <p className="text-sm text-gray-500">Measured on: {varianceData.maximum.measuredOn}</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h2 className="text-xl font-semibold">Minimum Variance</h2>
          <p className="text-2xl font-bold">{varianceData.minimum.price}</p>
          <p className="text-lg">{varianceData.minimum.percentage}</p>
          <p className="text-sm text-gray-500">Measured on: {varianceData.minimum.measuredOn}</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h2 className="text-xl font-semibold">Average Variance</h2>
          <p className="text-2xl font-bold">{varianceData.average.price}</p>
          <p className="text-lg">{varianceData.average.percentage}</p>
          <p className="text-sm text-gray-500">Measured on: {varianceData.average.measuredOn}</p>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------
// Cash Management Component
// --------------------------------------------------
function CashManagement() {
  const allCash = 10000;
  const projectedCash = 9500;
  const cashVariance = allCash - projectedCash;
  const workingCapital = 15000;
  const standardWorkingCapital = 14000;
  const workingCapitalVariance = workingCapital - standardWorkingCapital;

  const cashFlowBreakdownData = [
    { name: 'Operations', value: 4000 },
    { name: 'Investment', value: 2000 },
    { name: 'Financing', value: 1500 },
    { name: 'Total', value: 7500 },
  ];

  const monthlyCashFlowData = [
    { month: 'Jan', projected: 800, actual: 750, variance: 50 },
    { month: 'Feb', projected: 850, actual: 800, variance: 50 },
    { month: 'Mar', projected: 900, actual: 850, variance: 50 },
    { month: 'Apr', projected: 950, actual: 900, variance: 50 },
    { month: 'May', projected: 1000, actual: 950, variance: 50 },
    { month: 'Jun', projected: 1050, actual: 1000, variance: 50 },
    { month: 'Jul', projected: 1100, actual: 1050, variance: 50 },
    { month: 'Aug', projected: 1150, actual: 1100, variance: 50 },
    { month: 'Sep', projected: 1200, actual: 1150, variance: 50 },
    { month: 'Oct', projected: 1250, actual: 1200, variance: 50 },
    { month: 'Nov', projected: 1300, actual: 1250, variance: 50 },
    { month: 'Dec', projected: 1350, actual: 1300, variance: 50 },
  ];

  const dsoDays = 49;
  const accountsReceivable = 600;
  const dpoDays = 58;
  const accountsPayable = 500;

  const liquidityData = [
    { ratio: 'Cash Flow Ratio', value: 1.5 },
    { ratio: 'Interest Coverage', value: 3.0 },
    { ratio: 'Defensive Interval', value: 2.5 },
    { ratio: 'Quick Ratio', value: 1.8 },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-bold mb-2">Cash Flow</h2>
          <div className="text-3xl font-semibold mb-2">${allCash.toLocaleString()}</div>
          <div className="mb-1">Projected - ${projectedCash.toLocaleString()}</div>
          <div>Var - ${cashVariance.toLocaleString()}</div>
        </div>
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-bold mb-2">Working Capital</h2>
          <div className="text-3xl font-semibold mb-2">${workingCapital.toLocaleString()}</div>
          <div className="mb-1">Standard - ${standardWorkingCapital.toLocaleString()}</div>
          <div>Var - ${workingCapitalVariance.toLocaleString()}</div>
        </div>
      </div>

      {/* Detailed Visuals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-8">
          <div className="shadow p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Cash Flow Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashFlowBreakdownData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#FFA500" name="Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="shadow p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Total Cash Flow Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyCashFlowData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 300]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="projected" fill="#0000FF" name="Projected" />
                <Bar dataKey="actual" fill="#ADD8E6" name="Actual" />
                <Line type="monotone" dataKey="variance" stroke="#FF0000" name="Var" />
                <ReferenceLine y={48} stroke="gray" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="shadow p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Working Capital Details</h2>
            <div className="flex space-x-4">
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-orange-500 text-white text-lg font-bold">
                  {dsoDays} days
                </div>
                <div className="mt-2">Accounts Receivable: ${accountsReceivable}</div>
              </div>
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-blue-500 text-white text-lg font-bold">
                  {dpoDays} days
                </div>
                <div className="mt-2">Accounts Payable: ${accountsPayable}</div>
              </div>
            </div>
            <div className="mt-4 text-center font-semibold">Working Capital Ratio - 1.28</div>
            <div className="mt-4">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="border p-2">KPI</th>
                    <th className="border p-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">Current Assets</td>
                    <td className="border p-2">$20,000</td>
                  </tr>
                  <tr>
                    <td className="border p-2">Current Liabilities</td>
                    <td className="border p-2">$15,600</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="shadow p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Liquidity Ratio</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={liquidityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="ratio" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" name="Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Sales Tab Component (Sales-specific content)
// --------------------------------------------------
function SalesTab() {
  const salesGrowthData = [
    { month: 'Oct', segmentA: 4000, segmentB: 2400, segmentC: 2400 },
    { month: 'Nov', segmentA: 3000, segmentB: 1398, segmentC: 2210 },
    { month: 'Dec', segmentA: 2000, segmentB: 9800, segmentC: 2290 },
  ];
  const salesPerRepData = [
    { month: 'Jan', repA: 4000, repB: 3000, repC: 2000, target: 3500 },
    { month: 'Feb', repA: 5000, repB: 2000, repC: 3000, target: 3500 },
    { month: 'Mar', repA: 6000, repB: 4000, repC: 2500, target: 3500 },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Top Section: Three summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="shadow p-4 rounded text-center">
          <h2 className="text-xl font-bold">Auto date range</h2>
          <p className="mt-2">This Month</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h2 className="text-xl font-bold">Services</h2>
          <p className="mt-2">All</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h2 className="text-xl font-bold">Posts</h2>
          <p className="mt-2">All</p>
        </div>
      </section>
      {/* Second Section: Four metrics cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="shadow p-4 rounded text-center">
          <h3 className="text-lg font-bold">Total Accounts</h3>
          <p className="text-2xl font-semibold mt-2">2,104</p>
          <p className="text-green-500 mt-1">↑ 20%</p>
          <p className="text-sm text-gray-500 mt-1">vs previous 30 days</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h3 className="text-lg font-bold">Orders per Month</h3>
          <p className="text-2xl font-semibold mt-2">37</p>
          <p className="text-green-500 mt-1">↑ 15</p>
          <p className="text-sm text-gray-500 mt-1">vs previous 30 days</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h3 className="text-lg font-bold">Average Contract</h3>
          <p className="text-2xl font-semibold mt-2">1,553</p>
          <p className="text-green-500 mt-1">↑ 7.3%</p>
          <p className="text-sm text-gray-500 mt-1">vs previous 30 days</p>
        </div>
        <div className="shadow p-4 rounded text-center">
          <h3 className="text-lg font-bold">Growth Rate</h3>
          <p className="text-2xl font-semibold mt-2">8.29%</p>
          <p className="text-green-500 mt-1">↑ 1.3%</p>
          <p className="text-sm text-gray-500 mt-1">vs previous 30 days</p>
        </div>
      </section>
      {/* Third Section: Two charts side by side */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Growth by Market Segment */}
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-bold mb-4">Sales Growth by Market Segment</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesGrowthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="segmentA" stroke="#3182ce" name="Segment A" />
              <Line type="monotone" dataKey="segmentB" stroke="#F6AD55" name="Segment B" />
              <Line type="monotone" dataKey="segmentC" stroke="#805ad5" name="Segment C" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Sales per Rep */}
        <div className="shadow p-4 rounded">
          <h2 className="text-xl font-bold mb-4">Sales per Rep</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesPerRepData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="repA" fill="#BEE3F8" name="Rep A" />
              <Bar dataKey="repB" fill="#3182ce" name="Rep B" />
              <Bar dataKey="repC" fill="#2B6CB0" name="Rep C" />
              <Line type="monotone" dataKey="target" stroke="#E53E3E" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------
// Inventory Overview Component (Inventory-specific content)
// --------------------------------------------------
function InventoryOverview() {
  return (
    <div className="p-8 space-y-8">
      {/* Top Section: Three cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Inventory By Product */}
        <div className="shadow p-4 rounded text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</div>
            <h2 className="text-xl font-bold">Inventory By Product (Top 20)</h2>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <div style={{ width: 100, height: 100 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Dark Green', value: 30, color: '#006400' },
                      { name: 'Yellow', value: 20, color: '#FFD700' },
                      { name: 'Blue', value: 25, color: '#1E90FF' },
                      { name: 'Pink', value: 15, color: '#FF69B4' },
                      { name: 'Orange', value: 10, color: '#FFA500' },
                    ]}
                    dataKey="value"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                  >
                    {[
                      { name: 'Dark Green', value: 30, color: '#006400' },
                      { name: 'Yellow', value: 20, color: '#FFD700' },
                      { name: 'Blue', value: 25, color: '#1E90FF' },
                      { name: 'Pink', value: 15, color: '#FF69B4' },
                      { name: 'Orange', value: 10, color: '#FFA500' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Dark Green', value: '30%', color: '#006400' },
                { label: 'Yellow', value: '20%', color: '#FFD700' },
                { label: 'Blue', value: '25%', color: '#1E90FF' },
                { label: 'Pink', value: '15%', color: '#FF69B4' },
                { label: 'Orange', value: '10%', color: '#FFA500' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Card 2: Inventory by DC */}
        <div className="shadow p-4 rounded text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">2</div>
            <h2 className="text-xl font-bold">Inventory by DC (Top 20)</h2>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <div style={{ width: 100, height: 100 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Red', value: 35, color: '#FF0000' },
                      { name: 'Purple', value: 25, color: '#800080' },
                      { name: 'Teal', value: 20, color: '#008080' },
                      { name: 'Orange', value: 10, color: '#FFA500' },
                      { name: 'Grey', value: 10, color: '#808080' },
                    ]}
                    dataKey="value"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                  >
                    {[
                      { name: 'Red', value: 35, color: '#FF0000' },
                      { name: 'Purple', value: 25, color: '#800080' },
                      { name: 'Teal', value: 20, color: '#008080' },
                      { name: 'Orange', value: 10, color: '#FFA500' },
                      { name: 'Grey', value: 10, color: '#808080' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Red', value: '35%', color: '#FF0000' },
                { label: 'Purple', value: '25%', color: '#800080' },
                { label: 'Teal', value: '20%', color: '#008080' },
                { label: 'Orange', value: '10%', color: '#FFA500' },
                { label: 'Grey', value: '10%', color: '#808080' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Card 3: Key Inventory Stats */}
        <div className="shadow p-4 rounded text-center">
          <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold mx-auto">3</div>
          <div className="mt-2 text-lg font-semibold">250,000</div>
          <p className="text-sm text-gray-500">Total Units on Hand</p>
          <div className="mt-2 text-lg font-semibold">$500,000</div>
          <p className="text-sm text-gray-500">Total Dollars on Hand</p>
          <div className="mt-2 text-lg font-semibold">2025-3-3</div>
          <p className="text-sm text-gray-500">Current Report Date</p>
        </div>
      </section>

      {/* Bottom Section: Inventory Table */}
      <section className="mt-8">
        <div className="shadow p-4 rounded">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">4</div>
            <h2 className="text-xl font-bold">Current Inventory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 border">Product</th>
                  <th className="px-4 py-2 border">UPC</th>
                  <th className="px-4 py-2 border">Dollars on Hand</th>
                  <th className="px-4 py-2 border">Quantity on Hand</th>
                  <th className="px-4 py-2 border">Weeks of Supply</th>
                  <th className="px-4 py-2 border">Avg Dollars on Hand</th>
                  <th className="px-4 py-2 border">Avg Quantity on Hand</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { product: 'Product A', upc: '123456789012', dollars: '$1,000', qty: 50, weeks: 4, avgDollars: '$20', avgQty: 5 },
                  { product: 'Product B', upc: '234567890123', dollars: '$2,000', qty: 30, weeks: 3, avgDollars: '$25', avgQty: 3 },
                  { product: 'Product C', upc: '345678901234', dollars: '$1,500', qty: 40, weeks: 5, avgDollars: '$30', avgQty: 4 },
                  { product: 'Product D', upc: '456789012345', dollars: '$3,000', qty: 20, weeks: 2, avgDollars: '$35', avgQty: 2 },
                  { product: 'Product E', upc: '567890123456', dollars: '$2,500', qty: 60, weeks: 6, avgDollars: '$40', avgQty: 6 },
                ].map((item, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="px-4 py-2 border">{item.product}</td>
                    <td className="px-4 py-2 border">{item.upc}</td>
                    <td className="px-4 py-2 border">{item.dollars}</td>
                    <td className="px-4 py-2 border">{item.qty}</td>
                    <td className="px-4 py-2 border">{item.weeks}</td>
                    <td className="px-4 py-2 border">{item.avgDollars}</td>
                    <td className="px-4 py-2 border">{item.avgQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------
// Main Dashboard Component with Tabs
// --------------------------------------------------
export default function CEODashboard({ salesData }: CEODashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'Cash Forecasting' | 'Cash Management' | 'Sales' | 'Inventory Overview'
  >('Cash Forecasting');

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="tabs flex space-x-4 p-4 border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === 'Cash Forecasting'
              ? 'border-b-2 border-blue-500 font-bold'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('Cash Forecasting')}
        >
          Cash Forecasting
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'Cash Management'
              ? 'border-b-2 border-blue-500 font-bold'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('Cash Management')}
        >
          Cash Management
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'Sales' ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('Sales')}
        >
          Sales
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'Inventory Overview'
              ? 'border-b-2 border-blue-500 font-bold'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('Inventory Overview')}
        >
          Inventory Overview
        </button>
      </div>

      {/* Render Content based on selected tab */}
      {activeTab === 'Cash Forecasting' ? (
        <CashForecasting salesData={salesData} />
      ) : activeTab === 'Cash Management' ? (
        <CashManagement />
      ) : activeTab === 'Sales' ? (
        <SalesTab />
      ) : (
        <InventoryOverview />
      )}
    </div>
  );
}