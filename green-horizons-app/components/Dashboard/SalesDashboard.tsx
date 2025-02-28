'use client';

import React from 'react';

interface SalesDashboardUser {
  id: string;
  email: string | null;
}

interface SalesData {
  id: string;
  // Add additional sales-related properties as needed.
}

interface SalesDashboardProps {
  user: SalesDashboardUser;
  employee: {
    role_name?: string;
    id: string;
    profile_id?: string;
    role_id?: string;
  };
  salesData: SalesData[];
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ user, employee, salesData }) => {
  return (
    <div>
      <h1>Sales Dashboard</h1>
      <p>User Email: {user.email}</p>
      <p>Employee Role: {employee.role_name}</p>
      <h2>Sales Data</h2>
      <pre>{JSON.stringify(salesData, null, 2)}</pre>
    </div>
  );
};

export default SalesDashboard;
