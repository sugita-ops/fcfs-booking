'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { TenantUser, Subcontractor, AdminUser, Tenant } from '@/types/database';

// User type enumeration
export type UserType = 'tenant_user' | 'subcontractor' | 'admin' | null;

// Extended user profile
export interface UserProfile {
  type: UserType;
  tenantUser?: TenantUser & { tenant?: Tenant };
  subcontractor?: Subcontractor;
  adminUser?: AdminUser;
}

// Auth context value type
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userType: 'tenant_user' | 'subcontractor', additionalData?: any) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Fetch user profile based on auth user
  const fetchProfile = async (authUser: User): Promise<UserProfile | null> => {
    try {
      // Check if admin user
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .eq('status', 'active')
        .single();

      if (adminUser) {
        return { type: 'admin', adminUser };
      }

      // Check if tenant user
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('*, tenant:tenants(*)')
        .eq('auth_user_id', authUser.id)
        .eq('status', 'active')
        .single();

      if (tenantUser) {
        return { type: 'tenant_user', tenantUser: tenantUser as TenantUser & { tenant: Tenant } };
      }

      // Check if subcontractor
      const { data: subcontractor } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .eq('status', 'active')
        .single();

      if (subcontractor) {
        return { type: 'subcontractor', subcontractor };
      }

      return { type: null };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      const newProfile = await fetchProfile(user);
      setProfile(newProfile);
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign up
  const signUp = async (
    email: string,
    password: string,
    userType: 'tenant_user' | 'subcontractor',
    additionalData?: any
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create profile based on user type
      if (data.user) {
        if (userType === 'subcontractor') {
          const { error: profileError } = await supabase
            .from('subcontractors')
            .insert({
              auth_user_id: data.user.id,
              code: `SUB-${Date.now()}`,
              company_name: additionalData?.companyName || 'New Company',
              email: email,
              ...additionalData,
            });

          if (profileError) throw profileError;
        }
        // tenant_user creation is typically done by tenant admin
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);
          const userProfile = await fetchProfile(initialSession.user);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (newSession?.user) {
          setUser(newSession.user);
          setSession(newSession);
          const userProfile = await fetchProfile(newSession.user);
          setProfile(userProfile);
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useTenantUser() {
  const { profile } = useAuth();
  return profile?.type === 'tenant_user' ? profile.tenantUser : null;
}

export function useSubcontractor() {
  const { profile } = useAuth();
  return profile?.type === 'subcontractor' ? profile.subcontractor : null;
}

export function useAdminUser() {
  const { profile } = useAuth();
  return profile?.type === 'admin' ? profile.adminUser : null;
}

export function useTenantId() {
  const tenantUser = useTenantUser();
  return tenantUser?.tenant_id || null;
}
