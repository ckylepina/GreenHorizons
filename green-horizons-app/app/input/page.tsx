'use client';

import { useState } from 'react';
import { getStrains } from './server';


export default async function InputPage() {
  // Fetch strain options server-side
  const strains = await getStrains();

  return <InputForm strains={strains} />;
}

function InputForm({ strains }: { strains: { id: string; strain_name: string }[] }) {
  const [formData, setFormData] = useState({
    strain_id: '',
    weight: '',
    type: '',
    harvest: '',
  });
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate Bag ID
      const bagId = `${formData.strain_id}-${formData.weight}-${formData.harvest}-${formData.type.toUpperCase()}`;

      // Insert data into the database
      const response = await fetch('/api/insertBag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bag_id: bagId,
          strain_id: formData.strain_id,
          weight: parseFloat(formData.weight),
          type: formData.type,
          harvest: formData.harvest,
        }),
      });

      if (!response.ok) throw new Error('Failed to insert bag into database.');

      // Generate QR Code
      const qrCode = await QRCode.toDataURL(JSON.stringify({ bag_id: bagId, ...formData }));
      setQrCodeData(qrCode);

      alert('Data submitted and QR code generated!');
    } catch (err) {
      console.error(err);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Input Data</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          name="strain_id"
          onChange={handleInputChange}
          required
          className="w-full border rounded p-2"
        >
          <option value="">Select Strain</option>
          {strains.map((strain) => (
            <option key={strain.id} value={strain.id}>
              {strain.strain_name}
            </option>
          ))}
        </select>

        <input
          type="number"
          name="weight"
          placeholder="Weight"
          onChange={handleInputChange}
          required
          className="w-full border rounded p-2"
        />

        <select
          name="type"
          onChange={handleInputChange}
          required
          className="w-full border rounded p-2"
        >
          <option value="">Select Bag Type</option>
          <option value="Big">Big</option>
          <option value="Small">Small</option>
          <option value="Micro">Micro</option>
        </select>

        <input
          type="text"
          name="harvest"
          placeholder="Harvest Number"
          onChange={handleInputChange}
          required
          className="w-full border rounded p-2"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {qrCodeData && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">Generated QR Code:</h2>
          <img src={qrCodeData} alt="QR Code" />
        </div>
      )}
    </div>
  );
}