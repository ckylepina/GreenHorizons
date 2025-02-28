// app/request-role/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getProfileByUserId,
  getUserPendingRoleRequest,
  getAllRoles,
} from '@/utils/supabase/queries';
import RequestRoleClientComponent from '@/components/RequestRoleClientComponent';

export default async function RequestRolePage() {
  const supabase = await createClient();

  // 1. Get the current user.
  const rawUser = await getCurrentUser(supabase);
  if (!rawUser) {
    redirect('/sign-in');
    return null;
  }

  // Normalize user so that email is never undefined.
  const user = {
    id: rawUser.id,
    email: rawUser.email ?? null,
  };

  // 2. Get the profile data using the user.id from auth.users.
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) {
    redirect('/sign-in');
    return null;
  }

  // 3. Get the pending role request (if any) using profile.id.
  const isPending = await getUserPendingRoleRequest(supabase, profile.id);

  // 4. Get available roles for selection.
  const roles = await getAllRoles(supabase);

  return (
    <RequestRoleClientComponent
      user={user}
      roles={roles}
      profile={profile}
      isPending={isPending ?? false}
    />
  );
}