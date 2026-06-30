import { useEffect, useState } from 'react';
import { Slot, Redirect, SplashScreen } from 'expo-router';
import { supabase } from '../src/lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setAuthChecked(true);
      SplashScreen.hideAsync().catch(() => {});
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return null;
  }

  if (!hasSession) {
    return <Redirect href="/login" />;
  }

  return <Slot />;
}