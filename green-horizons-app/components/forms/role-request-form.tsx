'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface RoleRequestFormProps {
  userId: string;
  roles: { id: string; name: string }[];
  hasPendingRequest: boolean;
}

export default function RoleRequestForm({
  userId,
  roles,
  hasPendingRequest,
}: RoleRequestFormProps) {
  const supabase = createClient();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedRole) {
      setError('Please select a role.');
      return;
    }

    if (hasPendingRequest) {
      setError('You already have a pending role request.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Insert role request into role_requests table
      const { error } = await supabase.from('role_requests').insert([
        {
          user_id: userId,
          desired_role_id: selectedRole,
          status: 'pending',
        },
      ]);

      if (error) throw new Error(error.message);

      alert('Role request submitted successfully!');
      window.location.reload(); // Refresh page to reflect changes
    } catch (err: unknown) {
      console.error('Error submitting role request:', err);

      // Narrow the error type before using it
      if (err instanceof Error) {
        setError(err.message || 'Failed to submit role request.');
      } else {
        setError('Failed to submit role request.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-gray-700">Select Role</span>
        <select
          className="block w-full mt-1 p-2 border rounded-md"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          required
          disabled={hasPendingRequest}
        >
          <option value="">-- Select a Role --</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-red-500">{error}</p>}

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        disabled={loading || hasPendingRequest}
      >
        {loading ? 'Submitting...' : hasPendingRequest ? 'Request Pending' : 'Request Role'}
      </button>

      {hasPendingRequest && <p className="text-yellow-500">You have a pending role request.</p>}
    </form>
  );
}
