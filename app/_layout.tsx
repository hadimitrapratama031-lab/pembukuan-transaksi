import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { isUnlocked, setUnlocked, isRelockPaused } from '../src/lib/appLock';
import { setMode } from '../src/lib/appMode';
import { ThemeProvider } from '../src/lib/ThemeContext';

// Root layout: render Stack + jaga kunci PIN setiap app background/resume.
// Auth check & redirect awal dilakukan di app/index.tsx
export default function RootLayout() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (isRelockPaused()) return; // lagi buka galeri/picker sistem, jangan kunci dulu
      if (state === 'background' || state === 'inactive') {
        // App diminimize / pindah ke app lain → kunci lagi.
        // Mode (Staff/Admin) juga di-reset supaya akun admin ditanya ulang
        // mau masuk sebagai apa setiap buka ulang app.
        setUnlocked(false);
        setMode(null);
      } else if (state === 'active') {
        checkRelock();
      }
    });
    return () => sub.remove();
  }, []);

  const checkRelock = async () => {
    if (isUnlocked()) return;
    const path = pathRef.current || '';
    // Jangan redirect kalau memang lagi di halaman login/pin/pin-setup.
    if (path.startsWith('/login') || path.startsWith('/pin') || path.startsWith('/brand-setup')) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('pin_hash').eq('id', user.id).single();
    if (prof?.pin_hash) {
      router.replace('/pin');
    }
  };

  return (
    <ThemeProvider>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="pin" />
      <Stack.Screen name="pin-setup" />
      <Stack.Screen name="brand-setup" />
      <Stack.Screen name="mode-select" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="(tabs)" />
    </Stack>
    </ThemeProvider>
  );
}
