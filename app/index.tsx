import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/lib/ThemeContext';
import { isUnlocked } from '../src/lib/appLock';
import { getMode } from '../src/lib/appMode';

// Entry point: cek sesi → cek PIN → redirect ke dashboard / pin / login
export default function Index() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<string>('/login');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setTarget('/login'); setLoading(false); return; }

      const userId = session.user.id;
      const { data: prof } = await supabase.from('profiles').select('pin_hash, role').eq('id', userId).single();

      if (!prof?.pin_hash) { setTarget('/pin-setup'); setLoading(false); return; }

      // isUnlocked() selalu false di cold start (variabel in-memory baru di-load),
      // jadi setiap app dibuka ulang dari kondisi tertutup PASTI diminta PIN lagi.
      if (!isUnlocked()) { setTarget('/pin'); setLoading(false); return; }

      if (prof.role === 'admin') {
        const mode = getMode();
        setTarget(mode === 'admin' ? '/admin' : mode === 'staff' ? '/(tabs)/dashboard' : '/mode-select');
      } else {
        setTarget('/(tabs)/dashboard');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueDark }}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
