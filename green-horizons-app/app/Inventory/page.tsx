// app/BagEntryForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import { QrReader } from 'react-qr-reader';

interface FormData {
  strain_type: string;
  weight: string;
  harvest_number: string;
  employee: string;
  num_bags: string;
}

interface Employee {
  id: string;
  name: string;
}

export default function BagEntryForm() {
  const [formData, setFormData] = useState<FormData>({
    strain_type: '',
    weight: '',
    harvest_number: '',
    employee: '',
    num_bags: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]); // Optional: If fetching employees from Supabase

  useEffect(() => {
    // Optional: Fetch employee list from Supabase
    const fetchEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('id, name');
      if (error) {
        console.error('Error fetching employees:', error.message);
      } else {
        setEmployees(data);
      }
    };

    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Client-side validation
    const { strain_type, weight, harvest_number, employee, num_bags } = formData;
    if (!strain_type || !weight || !harvest_number || !employee || !num_bags) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      setLoading(false);
      return;
    }

    // Prepare data for insertion
    const newBagEntry = {
      strain_type,
      weight: parseFloat(weight),
      harvest_number,
      employee,
      num_bags: parseInt(num_bags, 10),
      created_at: new Date().toISOString(),
      // If you decide to associate with a user later, you can add a user_id field here
    };

    try {
      const { data, error } = await supabase.from('bag_entries').insert([newBagEntry]);

      if (error) {
        console.error('Error inserting bag entry:', error.message);
        setMessage({ type: 'error', text: 'Failed to submit bag entry. Please try again.' });
      } else {
        setMessage({ type: 'success', text: 'Bag entry submitted successfully!' });
        setFormData({
          strain_type: '',
          weight: '',
          harvest_number: '',
          employee: '',
          num_bags: '',
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col gap-6 px-4">
      <h2 className="font-medium text-xl mb-4 text-center">Bag Entry</h2>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* Strain Type Input */}
        <label className="flex flex-col gap-1 text-center">
          <span>Strain Type: </span>
          <input
            type="text"
            name="strain_type"
            placeholder="Enter Strain Type"
            className="border rounded px-3 py-2"
            value={formData.strain_type}
            onChange={handleChange}
            required
          />
        </label>

        {/* Weight Input */}
        <label className="flex flex-col gap-1 text-center">
          <span>Weight:</span>
          <input
            type="number"
            name="weight"
            placeholder="Enter Weight (e.g., 3.5)"
            className="border rounded px-3 py-2"
            value={formData.weight}
            onChange={handleChange}
            required
            step="0.1"
          />
        </label>

        {/* Harvest Number Input */}
        <label className="flex flex-col gap-1 text-center">
          <span>Harvest Number:</span>
          <input
            type="text"
            name="harvest_number"
            placeholder="Enter Harvest #"
            className="border rounded px-3 py-2"
            value={formData.harvest_number}
            onChange={handleChange}
            required
          />
        </label>

        {/* Employee Dropdown */}
        <label className="flex flex-col gap-1 text-center">
          <span>Employee:</span>
          <select
            name="employee"
            className="border rounded px-3 py-2"
            value={formData.employee}
            onChange={handleChange}
            required
          >
            <option value="">Select Employee</option>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))
            ) : (
              <>
                <option value="Ceaser Bautista">Ceaser Bautista</option>
                <option value="Monique">Monique</option>
                {/* Fallback options if employees are not fetched */}
              </>
            )}
          </select>
        </label>

        {/* Number of Bags Input */}
        <label className="flex flex-col gap-1 text-center">
          <span>Number of Bags:</span>
          <input
            type="number"
            name="num_bags"
            placeholder="Enter Number of Bags"
            min="1"
            className="border rounded px-3 py-2"
            value={formData.num_bags}
            onChange={handleChange}
            required
          />
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 mt-4"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>

        {/* Success or Error Message */}
        {message && (
          <p
            className={`text-center mt-2 text-sm ${
              message.type === 'error' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </main>
  );
}
