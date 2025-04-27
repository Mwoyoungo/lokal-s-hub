import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Initialize session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // Listen for auth changes
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // loading
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
