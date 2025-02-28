'use client';

import React from 'react';
import { Employee } from '@/app/types/dashboard';

interface EmployeesSectionProps {
  employees: Employee[];
}

export default function EmployeesSection({ employees }: EmployeesSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-2">Employees</h2>
      {employees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <ul className="space-y-2">
          {employees.map((emp) => {
            const profile = emp.profiles?.[0];
            const role = emp.roles?.[0];
            const tenant = emp.tenants?.[0];

            return (
              <li
                key={emp.id}
                className="p-2 bg-neutral-800 rounded-md flex justify-between items-center"
              >
                <div>
                  <span className="text-white font-medium mr-2">
                    {profile ? `${profile.first_name} ${profile.last_name}` : 'No Name'}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({role ? role.name : 'No Role'})
                  </span>
                </div>
                <div className="text-gray-400 text-sm">
                  Tenant: {tenant ? tenant.name : 'No Tenant'} <br />
                  Email:{' '}
                  <a href={`mailto:${profile?.email || ''}`} className="text-blue-400">
                    {profile?.email || 'No Email'}
                  </a>
                  <br />
                  Created: {new Date(emp.created_at).toLocaleDateString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}