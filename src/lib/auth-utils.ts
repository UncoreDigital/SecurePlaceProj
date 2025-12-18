import { cache } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';

// Cached function to get user with profile in a single query
export const getUserWithProfile = cache(async () => {
  const supabase = await createServerSupabase();
  
  try {
    // Single query to get both user and profile data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { user: null, profile: null, error: userError?.message || 'No user found' };
    }
    
    // Get profile data in the same request
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role, firm_id')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.warn('Profile fetch warning:', profileError.message);
      return { user, profile: null, error: profileError.message };
    }
    
    return { user, profile, error: null };
  } catch (error: any) {
    console.error('getUserWithProfile error:', error);
    return { user: null, profile: null, error: error?.message || 'Authentication error' };
  }
});

// Cached function to require admin access
export const requireAdmin = cache(async () => {
  const { user, profile, error } = await getUserWithProfile();
  
  if (error || !user) {
    return { authorized: false, error: error || 'Not authenticated', role: null, firmId: null };
  }
  
  const role = profile?.role;
  const firmId = profile?.firm_id;
  
  if (role !== 'super_admin' && role !== 'firm_admin') {
    return { authorized: false, error: 'Insufficient permissions', role: null, firmId: null };
  }
  
  return { 
    authorized: true, 
    error: null, 
    role: role as 'super_admin' | 'firm_admin', 
    firmId: firmId as string | null 
  };
});

// Cached function to require super admin access
export const requireSuperAdmin = cache(async () => {
  const { user, profile, error } = await getUserWithProfile();
  
  if (error || !user) {
    return { authorized: false, error: error || 'Not authenticated', role: null, firmId: null };
  }
  
  const role = profile?.role;
  const firmId = profile?.firm_id;
  
  if (role !== 'super_admin') {
    return { authorized: false, error: 'Insufficient permissions', role: null, firmId: null };
  }
  
  return { 
    authorized: true, 
    error: null, 
    role: role as 'super_admin', 
    firmId: firmId as string | null 
  };
});
