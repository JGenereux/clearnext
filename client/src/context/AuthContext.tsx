import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithSlack: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const identities = supabaseUser.identities || [];
  const providers = identities
    .map(i => {
      if (i.provider === 'google') return 'google' as const;
      if (i.provider === 'slack_oidc') return 'slack' as const;
      return null;
    })
    .filter((p): p is 'google' | 'slack' => p !== null);

  const slackIdentity = identities.find(i => i.provider === 'slack_oidc');
  const slackUserId = slackIdentity?.identity_data?.provider_id || null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    display_name:
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'User',
    avatar_url: supabaseUser.user_metadata?.avatar_url || null,
    slack_user_id: slackUserId,
    providers,
  };
}

async function storeProviderToken(session: Session, provider: string) {
  if (!session.provider_token) return;
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${API_URL}/api/auth/store-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token || null,
        provider,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`storeProviderToken failed (${response.status}):`, body);
    }
  } catch (err) {
    console.error('Failed to store provider token:', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(mapSupabaseUser(currentSession.user));
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          setUser(mapSupabaseUser(newSession.user));

          // Only capture provider_token on SIGNED_IN — this is the reliable
          // moment after the PKCE code exchange completes with the token present.
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession.provider_token) {
            const identities = newSession.user.identities || [];
            const latestIdentity = identities.length > 0
              ? identities.reduce((a, b) =>
                  new Date(b.updated_at || 0) > new Date(a.updated_at || 0) ? b : a
                )
              : null;

            let provider = newSession.user.app_metadata?.provider || 'google';
            if (latestIdentity) {
              provider = latestIdentity.provider === 'slack_oidc' ? 'slack_oidc' : latestIdentity.provider;
            }

            await storeProviderToken(newSession, provider);
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/meetings.space.readonly https://www.googleapis.com/auth/calendar.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  const signInWithSlack = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'slack_oidc',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Clear legacy localStorage keys
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInWithGoogle, signInWithSlack, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
