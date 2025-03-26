'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/supabaseclient';
import { RoleRequest, Tenant } from '@/app/types/dashboard';

interface PendingRoleRequestsClientProps {
  initialRequests: RoleRequest[]; // Array of pending role requests passed as a prop
  tenants: Tenant[]; // Tenants passed as a prop
}

export default function PendingRoleRequestsClient({
  initialRequests,
  tenants,
}: PendingRoleRequestsClientProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [requests, setRequests] = useState<RoleRequest[]>(initialRequests); // Track the list of requests

  // Group the requests by the first role's name.
  const groupedRequests = requests.reduce((acc, request) => {
    const roleName = request.roles[0]?.name || 'Unknown';
    if (!acc[roleName]) {
      acc[roleName] = [];
    }
    acc[roleName].push(request);
    return acc;
  }, {} as { [roleName: string]: RoleRequest[] });

  const handleApprove = async (
    profileId: string,
    desiredRoleId: string,
    tenantId: string,
    requestId: string
  ) => {
    setIsSubmitting(true);
    setMessage('');
    setMessageType(null);

    if (!tenantId) {
      setMessage('Please select a tenant.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Approving role request with:', { profileId, desiredRoleId, tenantId });
      const requestData = {
        input_profile_id: profileId,
        input_role_id: desiredRoleId,
        input_tenant_id: tenantId,
      };

      const { error } = await supabase.rpc('accept_role_request', requestData);
      if (error) {
        console.error('Error approving role request:', error);
        setMessage('Error approving role request.');
        setMessageType('error');
      } else {
        setRequests((prevRequests) => prevRequests.filter((req) => req.id !== requestId));
        setMessage('Role request approved successfully.');
        setMessageType('success');
      }
    } catch (error) {
      console.error('Error during approval process:', error);
      setMessage('An error occurred while approving the role request.');
      setMessageType('error');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      {Object.keys(groupedRequests).map((role) => (
        <div key={role}>
          <h3 className="text-xl md:text-2xl font-semibold mb-4">{role}</h3>
          <ul className="space-y-4">
            {groupedRequests[role].map((request) => {
              const profile = request.profiles[0]; // Use first profile
              const roleData = request.roles[0]; // Use first role
              return (
                <li key={request.id} className="p-3 border rounded-md shadow-md">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    {/* Employee Details */}
                    <div className="flex flex-col space-y-1">
                      <div className="text-sm">
                        <strong>User:</strong>{' '}
                        {profile ? `${profile.first_name} ${profile.last_name}` : 'No Name'}
                      </div>
                      <div className="text-sm">
                        <strong>Requested Role:</strong> {roleData ? roleData.name : 'No Role'}
                      </div>
                      <div className="text-sm">
                        <strong>Status:</strong> {request.status}
                      </div>
                    </div>
                    {/* Action Area */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-auto">
                      {/* Tenant Dropdown */}
                      <select
                        className="p-2 border border-gray-300 rounded-md w-full md:w-40 text-sm"
                        id={`tenant-select-${request.id}`}
                      >
                        <option value="">-- Select Tenant --</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                      {/* Action Buttons */}
                      <div className="flex flex-col md:flex-row gap-2 w-full">
                        {request.status === 'pending' ? (
                          <>
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded-md w-full md:w-32 text-sm"
                              onClick={() =>
                                handleApprove(
                                  profile?.id || '',
                                  roleData?.id || '',
                                  (document.getElementById(`tenant-select-${request.id}`) as HTMLSelectElement)
                                    ?.value || '',
                                  request.id
                                )
                              }
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Submitting...' : 'Approve'}
                            </button>
                            <button
                              className="bg-red-500 text-white px-3 py-1 rounded-md w-full md:w-32 text-sm"
                              disabled={isSubmitting}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            className="bg-green-500 text-white px-3 py-1 rounded-md w-full md:w-32 text-sm"
                            disabled
                          >
                            Approved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {message && (
        <div className={`text-sm mb-4 ${messageType === 'success' ? 'text-green-500' : 'text-red-500'}`}>
          {message}
        </div>
      )}
    </div>
  );
}