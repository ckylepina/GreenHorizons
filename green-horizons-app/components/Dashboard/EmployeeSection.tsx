'use client';

import React from 'react';
import { Employee } from '@/app/types/dashboard';

interface EmployeesSectionProps {
  employees: Employee[];
}

export default function EmployeesSection({ employees }: EmployeesSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xl md:text-2xl font-semibold mb-2">Employees</h2>
      {employees.length === 0 ? (
        <p className="text-sm">No employees found.</p>
      ) : (
        <ul className="space-y-4">
          {employees.map((emp) => {
            const profile = emp.profiles?.[0];
            const role = emp.roles?.[0];
            const tenant = emp.tenants?.[0];

            return (
              <li
                key={emp.id}
                className="p-3 rounded-md flex flex-col md:flex-row md:justify-between md:items-center"
              >
                {/* Employee name and role */}
                <div className="flex flex-col">
                  <span className="font-medium text-base">
                    {profile ? `${profile.first_name} ${profile.last_name}` : 'No Name'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {role ? role.name : 'No Role'}
                  </span>
                </div>
                {/* Tenant, Email, and Created date */}
                <div className="mt-2 md:mt-0 text-gray-400 text-xs text-left">
                  <p>Tenant: {tenant ? tenant.name : 'No Tenant'}</p>
                  <p>
                    Email:{' '}
                    <a href={`mailto:${profile?.email || ''}`} className="text-blue-400">
                      {profile?.email || 'No Email'}
                    </a>
                  </p>
                  <p>Created: {new Date(emp.created_at).toLocaleDateString()}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}