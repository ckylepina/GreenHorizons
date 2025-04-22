'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { useTheme } from 'next-themes';
import { supabase } from '@/utils/supabase/supabaseclient';
import type { Database } from '@/database.types';
import CustomerSection from './CustomerSection';
import BagScannerSection from './BagScannerSection';
import type { BagRecord, Customer, Strain, BagSize, HarvestRoom } from '@/components/bag-entry-form/types';

// RPC return & arg types
type CreateCustomerArgs   = Database['public']['Functions']['create_customer']['Args'];
type CreateCustomerReturn = Database['public']['Functions']['create_customer']['Returns'][0];

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
  const { theme } = useTheme();
  const penColor = theme === 'dark' ? '#fff' : '#000';

  // CUSTOMER STATE
  const [mode, setMode]                         = useState<'existing'|'new'>('existing');
  const [searchTerm, setSearchTerm]             = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer|null>(null);
  const [newCustomer, setNewCustomer]           = useState({
    first_name:      '',
    last_name:       '',
    business_name:   '',
    license_number:  '',
    email:           '',
    phone:           '',
    drivers_license: '',
  });

  // BAG & TOTAL STATE
  const [scannedBags, setScannedBags] = useState<BagRecord[]>([]);
  const [saleTotal, setSaleTotal]     = useState(0);

  // SIGNATURE STATE
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewCustomer((c) => ({ ...c, [e.target.name]: e.target.value }));

  // Upload signature PNG → Supabase storage
  async function uploadSignature(): Promise<string|null> {
    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty()) {
      alert('Please sign before submitting.');
      return null;
    }
    setUploadingSignature(true);
    try {
      const dataUrl  = pad.getTrimmedCanvas().toDataURL('image/png');
      const blob     = await (await fetch(dataUrl)).blob();
      const fileName = `signature-${Date.now()}.png`;

      const { error: uploadError } = await supabase
        .storage
        .from('signatures')
        .upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data } = supabase
        .storage
        .from('signatures')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      console.error('Signature upload error:', err);
      alert('Failed to upload signature.');
      return null;
    } finally {
      setUploadingSignature(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1) Basic validation
    if (mode === 'existing' && !selectedCustomer) {
      alert('Please select an existing customer.');
      return;
    }
    if (mode === 'new') {
      const { first_name, last_name, email, drivers_license } = newCustomer;
      if (!first_name || !last_name || !email || !drivers_license) {
        alert('Please complete all new‐customer fields.');
        return;
      }
    }
    if (scannedBags.length === 0) {
      alert('Please scan at least one bag.');
      return;
    }
    if (saleTotal <= 0) {
      alert('Please set a sale total.');
      return;
    }

    // 2) Upload signature
    const signatureUrl = await uploadSignature();
    if (!signatureUrl) return;

    // 3) Create or fetch customer
    let customerId: string;
    if (mode === 'existing') {
      customerId = selectedCustomer!.id;
    } else {
      // call create_customer RPC
      const rpcArgs: CreateCustomerArgs = {
        p_first_name:      newCustomer.first_name,
        p_last_name:       newCustomer.last_name,
        p_business_name:   newCustomer.business_name,
        p_license_number:  newCustomer.license_number,
        p_email:           newCustomer.email,
        p_phone:           newCustomer.phone,
        p_drivers_license: newCustomer.drivers_license,
        p_tenant_id:       tenantId,
      };

      const { data, error: rpcError } = await supabase
        .rpc('create_customer', rpcArgs);

      if (rpcError) {
        console.error('create_customer RPC error:', rpcError);
        alert('Failed to create customer.');
        return;
      }
      // guard + cast
      if (!data || !Array.isArray(data) || data.length === 0) {
        alert('Unexpected response from server.');
        return;
      }
      const created = data as CreateCustomerReturn[];
      customerId = created[0].id;
    }

    // 4) Insert sale record
    const saleDate = new Date().toISOString();
    const { data: saleRows, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id:        customerId,
        sale_date:          saleDate,
        status:             'completed',
        tenant_id:          tenantId,
        total_amount:       saleTotal,
        signature_url:      signatureUrl,
        cash_transaction_id: null,
      }])
      .select();

    if (saleError || !saleRows || saleRows.length === 0) {
      console.error('Insert sale failed:', saleError);
      alert('Failed to record sale.');
      return;
    }
    const saleRecord = saleRows[0];

    // 5) Insert sale_items
    const pricePerBag = saleTotal / scannedBags.length;
    const saleItems = scannedBags.map(b => ({
      sale_id: saleRecord.id,
      bag_id:  b.id,
      price:   pricePerBag,
    }));
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    if (itemsError) {
      console.error('Insert sale_items failed:', itemsError);
      alert('Failed to save sale items.');
      return;
    }

    // 6) Cash transaction
    const cashTx = {
      tenant_id:        tenantId,
      transaction_type: 'sale' as const,
      amount:           saleTotal,
      description:      'Sale transaction',
      transaction_date: saleDate,
      created_by:       currentEmployeeId,
      updated_by:       currentEmployeeId,
    };
    const { data: cashRows, error: cashError } = await supabase
      .from('cash_transactions')
      .insert([cashTx])
      .select();
    if (cashError || !cashRows || cashRows.length === 0) {
      console.error('Insert cash_tx failed:', cashError);
      alert('Failed to record cash transaction.');
      return;
    }
    const cashRecord = cashRows[0];

    // 7) Link back to sale
    const { error: linkError } = await supabase
      .from('sales')
      .update({ cash_transaction_id: cashRecord.id })
      .eq('id', saleRecord.id);
    if (linkError) {
      console.error('Link cash to sale failed:', linkError);
      alert('Failed to finalize sale.');
      return;
    }

    // 8) Mark bags sold
    const bagIds = scannedBags.map(b => b.id);
    const { error: bagError } = await supabase
      .from('bags')
      .update({ current_status: 'sold' })
      .in('id', bagIds);
    if (bagError) {
      console.error('Update bag status failed:', bagError);
      alert('Failed to update bag status.');
      return;
    }

    // 9) Redirect to invoice
    router.push(`/invoice/${saleRecord.id}`);
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

      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">Digital Signature</h2>
        <SignatureCanvas
          ref={signaturePadRef}
          penColor={penColor}
          canvasProps={{ className: 'w-full h-48 border' }}
        />
        <button
          type="button"
          onClick={() => signaturePadRef.current?.clear()}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded"
        >
          Clear Signature
        </button>
      </div>

      <button
        type="submit"
        disabled={uploadingSignature}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {uploadingSignature ? 'Uploading…' : 'Submit Sale'}
      </button>
    </form>
  );
}