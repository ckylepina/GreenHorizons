'use client';

import React, { useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { supabase } from '@/utils/supabase/supabaseclient';

// Define types for the props
interface Role {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  // add additional profile fields if needed
}

interface RequestRoleClientComponentProps {
  profile: Profile;
  isPending: boolean;
  roles: Role[];
}

export default function RequestRoleClientComponent({
  profile,
  roles,
  isPending,
}: RequestRoleClientComponentProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  // Disable form submission if a request is pending
  const isRequestSubmitted = isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      setMessage('Please select a role.');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType(null);

    try {
      // Insert the role request into the 'role_requests' table
      const { error } = await supabase
        .from('role_requests')
        .insert([
          {
            profile_id: profile.id, // Use profile_id instead of user_id
            desired_role_id: selectedRole,
            status: 'pending', // Set status to 'pending'
          },
        ]);

      if (error) {
        console.error('Error submitting role request:', error);
        setMessage('Error submitting role request.');
        setMessageType('error');
      } else {
        setMessage('Role request submitted successfully.');
        setMessageType('success');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      setMessage('An error occurred while submitting the role request.');
      setMessageType('error');
    }

    setIsSubmitting(false);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex-1 w-full flex flex-col gap-12">
        <div className="w-full">
          {isRequestSubmitted ? (
            <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
              <InfoIcon size="16" strokeWidth={2} />
              Your role request is pending approval. Please wait for confirmation.
            </div>
          ) : (
            <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
              <InfoIcon size="16" strokeWidth={2} />
              You are authenticated but do not have a role yet. Please request a role below.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <h2 className="font-bold text-2xl mb-4">Request a Role</h2>
          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-semibold mb-2">
              Select Role
            </label>
            <select
              id="role"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isRequestSubmitted}
            >
              <option value="">-- Select Role --</option>
              {roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))
              ) : (
                <option disabled>No roles available</option>
              )}
            </select>
          </div>

          {message && (
            <div
              className={`text-sm mb-4 ${
                messageType === 'success' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded-md"
            disabled={isSubmitting || isRequestSubmitted}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </main>
  );
}