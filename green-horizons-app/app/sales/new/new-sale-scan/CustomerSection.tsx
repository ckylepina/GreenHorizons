// CustomerSection.tsx
'use client';

import React from 'react';
import type { Customer } from '@/components/bag-entry-form/types';

interface CustomerSectionProps {
  mode: 'existing' | 'new';
  setMode: (mode: 'existing' | 'new') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  newCustomer: {
    first_name: string;
    last_name: string;
    business_name: string;
    license_number: string;
    email: string;
    phone: string;
  };
  handleNewCustomerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CustomerSection: React.FC<CustomerSectionProps> = ({
  mode,
  setMode,
  searchTerm,
  setSearchTerm,
  searchResults,
  selectedCustomer,
  setSelectedCustomer,
  newCustomer,
  handleNewCustomerChange,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedCustomer(null);
  };

  return (
    <section className="border p-4 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-2">Customer Details</h2>
      <div className="mb-4">
        <label className="mr-4">
          <input
            type="radio"
            value="existing"
            checked={mode === 'existing'}
            onChange={() => setMode('existing')}
            className="mr-1"
          />
          Existing Customer
        </label>
        <label>
          <input
            type="radio"
            value="new"
            checked={mode === 'new'}
            onChange={() => setMode('new')}
            className="mr-1"
          />
          New Customer
        </label>
      </div>
      {mode === 'existing' ? (
        <div>
          <label htmlFor="customer_search" className="block text-sm font-medium">
            Search Customer
          </label>
          <input
            type="text"
            id="customer_search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Enter first name..."
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
          />
          {searchResults.length > 0 && (
            <ul className="border border-gray-200 mt-2 max-h-40 overflow-y-auto">
              {searchResults.map((customer) => (
                <li
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setSearchTerm(`${customer.first_name} ${customer.last_name}`);
                  }}
                  className={`cursor-pointer p-2 hover:bg-gray-100 ${
                    selectedCustomer?.id === customer.id ? 'bg-gray-200' : ''
                  }`}
                >
                  {customer.first_name} {customer.last_name} - {customer.email}
                </li>
              ))}
            </ul>
          )}
          {selectedCustomer && (
            <div className="mt-2 p-2 bg-green-100 rounded">
              Selected: {selectedCustomer.first_name} {selectedCustomer.last_name}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={newCustomer.first_name}
              onChange={handleNewCustomerChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={newCustomer.last_name}
              onChange={handleNewCustomerChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium">
              Business Name
            </label>
            <input
              type="text"
              name="business_name"
              id="business_name"
              value={newCustomer.business_name}
              onChange={handleNewCustomerChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="license_number" className="block text-sm font-medium">
              License Number
            </label>
            <input
              type="text"
              name="license_number"
              id="license_number"
              value={newCustomer.license_number}
              onChange={handleNewCustomerChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={newCustomer.email}
              onChange={handleNewCustomerChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              value={newCustomer.phone}
              onChange={handleNewCustomerChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerSection;
