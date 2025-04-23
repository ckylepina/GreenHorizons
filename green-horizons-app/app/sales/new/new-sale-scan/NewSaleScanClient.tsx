'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import SignatureSection, { SignatureSectionHandle } from './SignatureSection';
import SaleSummary from './SaleSummary';

import { validateSale } from './utils/validateSales';
import { useNewSale } from './hooks/useNewSale';

import type {
  Strain,
  BagSize,
  HarvestRoom,
  Customer,
  BagRecord,
} from '@/components/bag-entry-form/types';

interface NewSaleScanClientProps {
  initialStrains: Strain[];
  initialBagSizes: BagSize[];
  initialHarvestRooms: HarvestRoom[];
  currentEmployeeId: string;
  tenantId: string;
}

export default function NewSaleScanClient({
  initialStrains,
  initialBagSizes,
  initialHarvestRooms,
  currentEmployeeId,
  tenantId,
}: NewSaleScanClientProps) {
  const router = useRouter();

  // Section state
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    license_number: '',
    email: '',
    phone: '',
    drivers_license: '',
  });
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal] = useState(0);

  // Signature ref
  const sigRef = useRef<SignatureSectionHandle>(null);

  // Hook
  const { submitSale, isLoading, error } = useNewSale();

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomer((c) => ({ ...c, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // get signature blob
    const dataUrl = sigRef.current?.getSignatureDataUrl();
    const signatureBlob = dataUrl
      ? await (await fetch(dataUrl)).blob()
      : new Blob();

    // validate
    const errors = validateSale({
      mode,
      selectedCustomer,
      newCustomer,
      scannedBags,
      saleTotal,
      signatureBlob,
      currentEmployeeId,
      tenantId,
    });
    if (errors.length) {
      alert(errors.join('\n\n'));
      return;
    }

    try {
      // 1) submit sale in Supabase
      const saleId = await submitSale({
        mode,
        selectedCustomer,
        newCustomer,
        scannedBags,
        saleTotal,
        signatureBlob,
        currentEmployeeId,
        tenantId,
      });

      // 2) ensure customer exists in Zoho
      await fetch('/api/zoho/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_customer_id: mode === 'existing'
          ? selectedCustomer!.id
          : saleId /* assuming saleId matches new customer RPC result—in practice store customerId locally */ }),
      });

      // 3) sync sale as Zoho Sales Order
      await fetch('/api/zoho/salesorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_id: saleId }),
      });

      // 4) navigate to invoice
      router.push(`/invoice/${saleId}`);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      alert(`Sale failed: ${e.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto p-4 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Make a Sale (Scan Bags)</h1>

      <CustomerSection
        mode={mode}
        setMode={setMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        newCustomer={newCustomer}
        handleNewCustomerChange={handleNewCustomerChange}
      />

      <BagScannerSection
        initialStrains={initialStrains}
        initialBagSizes={initialBagSizes}
        initialHarvestRooms={initialHarvestRooms}
        onBagsChange={setScannedBags}
        onTotalChange={setSaleTotal}
      />

      <SignatureSection ref={sigRef} />

      <SaleSummary
        total={saleTotal}
        count={scannedBags.length}
        isLoading={isLoading}
      />

      {error && (
        <p className="text-red-600">Error recording sale: {error.message}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Processing…' : 'Submit Sale'}
      </button>
    </form>
  );
}