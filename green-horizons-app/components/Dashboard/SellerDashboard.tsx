'use client';

import React from 'react';
import SellerQuickActions from './quick-actions/SellerQuickActions';

interface SellerDashboardUser {
  id: string;
  email: string | null;
}

interface SellerDashboardProps {
  user: SellerDashboardUser;
}

export default function SellerDashboard({ user }: SellerDashboardProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Seller Dashboard</h1>
      <p className="mb-6">
        Welcome, <strong>{user.email}</strong>!
      </p>

      {/* Seller-specific Quick Actions */}
      <SellerQuickActions />
    </main>
  );
}
