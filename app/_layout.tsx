import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/lib/theme';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/login');
      }
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/login');
      }
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueDark }}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
