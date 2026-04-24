import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey, SUPABASE_URL } from '../../../utils/supabase/info';

// ─── Types ───

export interface UserProfile {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  rollNo: string;
  department: string;
  year: string;
  hostel?: string;
  hasCycle?: boolean;
  profileEmoji?: string;
  avatar: string;
  stats: {
    walkKm: number;
    cycleKm: number;
    autoRides: number;
    co2Saved: number;
    streak: number;
    ecoScore: number;
  };
  createdAt: string;
}

interface SignupData {
  name: string;
  email: string;
  rollNo: string;
  department: string;
  year: string;
  password: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateStats: (delta: Partial<UserProfile['stats']>) => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Singleton Supabase client ───

// Use globalThis to survive Vite HMR re-executions — avoids duplicate GoTrueClient instances
const SUPABASE_KEY = '__iitd_supabase_client';
function getSupabase(): SupabaseClient {
  if (!(globalThis as any)[SUPABASE_KEY]) {
    (globalThis as any)[SUPABASE_KEY] = createClient(SUPABASE_URL, publicAnonKey);
  }
  return (globalThis as any)[SUPABASE_KEY];
}

// ─── Provider ───

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // We keep a ref so fire-and-forget callbacks always see the latest value
  // without needing to re-create memoised functions.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Fetch profile + stats from DB and merge into UserProfile
  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const supabase = getSupabase();
      console.log('loadProfile: Getting auth user...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('loadProfile: No auth user found');
        return null;
      }

      console.log('loadProfile: Fetching profile for user:', user.id);
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (profileError) {
        console.error('loadProfile: Profile query error:', profileError);
        return null;
      }
      
      console.log('loadProfile: Fetching stats for user:', user.id);
      const { data: statsData, error: statsError } = await supabase.from('stats').select('*').eq('user_id', user.id).single();
      
      if (statsError) {
        console.warn('loadProfile: Stats query error (non-critical):', statsError);
        // Stats error is non-critical, continue without stats
      }

      if (!profileData) {
        console.log('loadProfile: No profile data found for user');
        return null;
      }

      const profile: UserProfile = {
        id: profileData.id,
        name: profileData.name || '',
        email: profileData.email || '',
        rollNo: profileData.roll_no || '',
        department: profileData.department || '',
        year: profileData.year || '',
        avatar: profileData.avatar || '',
        nickname: profileData.nickname || undefined,
        hostel: profileData.hostel || undefined,
        hasCycle: profileData.has_cycle || false,
        profileEmoji: profileData.profile_emoji || undefined,
        createdAt: profileData.created_at || new Date().toISOString(),
        stats: statsData ? {
          walkKm: statsData.walk_km || 0,
          cycleKm: statsData.cycle_km || 0,
          autoRides: statsData.auto_rides || 0,
          co2Saved: statsData.co2_saved || 0,
          streak: statsData.streak || 0,
          ecoScore: statsData.eco_score || 0,
        } : {
          walkKm: 0,
          cycleKm: 0,
          autoRides: 0,
          co2Saved: 0,
          streak: 0,
          ecoScore: 0,
        },
      };
      console.log('loadProfile: Profile loaded successfully', profile.name);
      return profile;
    } catch (err) {
      console.error('loadProfile: Failed to load profile:', err);
      return null;
    }
  }, []);

  // ─── Bootstrap: single source of truth via onAuthStateChange ───
  useEffect(() => {
    const supabase = getSupabase();
    let initDone = false;

    // Safety timeout: if init takes more than 10 seconds, force it to complete
    const timeoutId = setTimeout(() => {
      if (!initDone) {
        console.warn('Auth initialization timeout - forcing completion');
        initDone = true;
        setIsLoading(false);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Session:', !!session);

        try {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            if (!initDone) { initDone = true; setIsLoading(false); }
            return;
          }

          if (session?.access_token) {
            // Load profile on first session and sign-in; skip on TOKEN_REFRESHED
            // because we already have the user in state.
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              const profile = await loadProfile();
              if (profile) {
                setUser(profile);
              } else {
                // If profile loading fails, create a temporary profile from auth data
                console.warn('Profile loading failed, creating temporary profile');
                const tempProfile: UserProfile = {
                  id: session.user.id,
                  name: session.user.user_metadata?.name || 'User',
                  email: session.user.email || '',
                  rollNo: session.user.user_metadata?.rollNo || 'N/A',
                  department: session.user.user_metadata?.department || 'CSE',
                  year: session.user.user_metadata?.year || '1st Year',
                  avatar: 'U',
                  nickname: undefined,
                  hostel: undefined,
                  hasCycle: false,
                  profileEmoji: undefined,
                  createdAt: new Date().toISOString(),
                  stats: {
                    walkKm: 0,
                    cycleKm: 0,
                    autoRides: 0,
                    co2Saved: 0,
                    streak: 0,
                    ecoScore: 0,
                  },
                };
                setUser(tempProfile);
              }
            }
          }

          if (!initDone) { initDone = true; setIsLoading(false); }
        } catch (err) {
          console.error('Auth callback error:', err);
          if (!initDone) { initDone = true; setIsLoading(false); }
        }
      },
    );

    return () => { 
      clearTimeout(timeoutId);
      subscription.unsubscribe(); 
    };
  }, [loadProfile]);

  // ─── Login ───
  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        return { success: false, error: error.message };
      }

      // onAuthStateChange SIGNED_IN will fire and attempt to load the profile.
      // If loading the profile fails (e.g. profile row not present), create
      // a temporary profile from auth data so the app can proceed.
      const profile = await loadProfile();
      if (profile) {
        setUser(profile);
        return { success: true };
      }

      // Fallback: build a temporary profile from the auth response so login
      // doesn't fail when the `profiles` row is missing or the DB query fails.
      const authUser = data?.user;
      if (authUser) {
        const tempProfile: UserProfile = {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          rollNo: authUser.user_metadata?.rollNo || 'N/A',
          department: authUser.user_metadata?.department || 'CSE',
          year: authUser.user_metadata?.year || '1st Year',
          avatar: 'U',
          nickname: undefined,
          hostel: undefined,
          hasCycle: false,
          profileEmoji: undefined,
          createdAt: new Date().toISOString(),
          stats: {
            walkKm: 0,
            cycleKm: 0,
            autoRides: 0,
            co2Saved: 0,
            streak: 0,
            ecoScore: 0,
          },
        };
        setUser(tempProfile);
        return { success: true };
      }

      return { success: false, error: 'Failed to load user profile after login.' };
    } catch (err: any) {
      console.error('Login unexpected error:', err);
      return { success: false, error: err.message ?? 'Unexpected login error.' };
    }
  }, [loadProfile]);

  // ─── Signup ───
  const signup = useCallback(async (
    data: SignupData,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabase();

      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: {
            name: data.name,
            rollNo: data.rollNo,
            department: data.department,
            year: data.year,
          },
        },
      });

      if (authError || !authData.user?.id) {
        console.error('Signup auth error:', authError?.message);
        return { success: false, error: authError?.message ?? 'Signup failed' };
      }

      const userId = authData.user.id;
      const avatar = data.name.trim().split(" ").map((n: string) => n[0]?.toUpperCase() ?? "").join("").slice(0, 2);

      // If email confirmation is enabled in Supabase, signup can succeed
      // without an active session. In that case we should not attempt inserts/login.
      if (!authData.session) {
        return {
          success: false,
          error: 'Account created. Please confirm your email, then sign in.',
        };
      }

      // 2. Best-effort profile creation (do not hard-fail signup if this errors)
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        roll_no: data.rollNo.toUpperCase().trim(),
        department: data.department,
        year: data.year,
        avatar: avatar,
      });
      if (profileError) {
        console.warn('Profile creation warning (continuing):', profileError);
      }

      // 3. Best-effort stats creation (do not hard-fail signup if this errors)
      const { error: statsError } = await supabase.from('stats').insert({
        user_id: userId,
        walk_km: 0,
        cycle_km: 0,
        auto_rides: 0,
        co2_saved: 0,
        streak: 0,
        eco_score: 0,
      });
      if (statsError) {
        console.warn('Stats creation warning (continuing):', statsError);
      }

      // 4. Auto-login
      return await login(data.email, data.password);
    } catch (err: any) {
      console.error('Signup error:', err);
      return { success: false, error: err.message ?? 'Signup failed.' };
    }
  }, [login]);

  // ─── Logout ───
  const logout = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
  }, []);

  // ─── Update Stats (optimistic + server sync) ───
  const updateStats = useCallback((delta: Partial<UserProfile['stats']>) => {
    setUser((prev: UserProfile | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          walkKm: prev.stats.walkKm + (delta.walkKm ?? 0),
          cycleKm: prev.stats.cycleKm + (delta.cycleKm ?? 0),
          autoRides: prev.stats.autoRides + (delta.autoRides ?? 0),
          co2Saved: prev.stats.co2Saved + (delta.co2Saved ?? 0),
          streak: delta.streak !== undefined ? delta.streak : prev.stats.streak,
          ecoScore: prev.stats.ecoScore + (delta.ecoScore ?? 0),
        },
      };
    });

    // Sync to DB
    if (userRef.current?.id) {
      const supabase = getSupabase();
      const currentUser = userRef.current; // Capture reference to avoid null warnings
      (async () => {
        await supabase.from('stats').update({
          walk_km: (currentUser.stats.walkKm + (delta.walkKm ?? 0)),
          cycle_km: (currentUser.stats.cycleKm + (delta.cycleKm ?? 0)),
          auto_rides: (currentUser.stats.autoRides + (delta.autoRides ?? 0)),
          co2_saved: (currentUser.stats.co2Saved + (delta.co2Saved ?? 0)),
          streak: delta.streak !== undefined ? delta.streak : currentUser.stats.streak,
          eco_score: (currentUser.stats.ecoScore + (delta.ecoScore ?? 0)),
        }).eq('user_id', currentUser.id);
      })().catch((err: any) => console.error('Failed to sync stats:', err));
    }
  }, []);

  // ─── Update Profile (optimistic + server sync) ───
  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    const previousUser = userRef.current;

    setUser((prev: UserProfile | null) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });

    if (!previousUser?.id) {
      return { success: false, error: 'No signed-in user found.' };
    }

    try {
      const supabase = getSupabase();
      const { stats, ...profileFields } = data as any;

      // Map camelCase fields to snake_case for DB (server expects snake_case)
      const dbFields: any = {};
      Object.entries(profileFields).forEach(([key, value]) => {
        if (key === 'rollNo') dbFields.roll_no = value;
        else if (key === 'hasCycle') dbFields.has_cycle = value;
        else if (key === 'profileEmoji') dbFields.profile_emoji = value;
        else if (key === 'createdAt') dbFields.created_at = value;
        else if (key !== 'stats' && key !== 'id') dbFields[key] = value;
      });

      // Use server endpoint to perform the update (server uses service role and returns the updated profile)
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;

      const resp = await fetch('/make-server-a578ca2f/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(dbFields),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || (json && json.error)) {
        throw new Error(json?.error || `Profile update failed (status ${resp.status})`);
      }

      // Merge returned profile into local state (server returns camelCase-mapped profile)
      if (json && json.profile) {
        const p = json.profile;
        const merged: UserProfile = {
          id: p.id,
          name: p.name || previousUser.name,
          email: p.email || previousUser.email,
          rollNo: p.rollNo ?? previousUser.rollNo,
          department: p.department ?? previousUser.department,
          year: p.year ?? previousUser.year,
          avatar: p.avatar ?? previousUser.avatar,
          nickname: p.nickname ?? previousUser.nickname,
          hostel: p.hostel ?? previousUser.hostel,
          hasCycle: p.hasCycle ?? previousUser.hasCycle ?? false,
          profileEmoji: p.profileEmoji ?? previousUser.profileEmoji,
          createdAt: p.createdAt ?? previousUser.createdAt,
          stats: previousUser.stats,
        };
        setUser(merged);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Failed to sync profile:', err);
      setUser(previousUser);
      return { success: false, error: err?.message ?? 'Failed to save profile.' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateStats, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
