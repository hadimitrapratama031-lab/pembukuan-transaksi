import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/lib/ThemeContext';

export default function LoginScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login Gagal', error.message.includes('Invalid login')
        ? 'Email atau password salah.' : error.message);
      setLoading(false);
      return;
    }

    // Cek apakah user sudah punya PIN
    const { data: prof } = await supabase.from('profiles').select('pin_hash').eq('id', data.user.id).single();
    setLoading(false);
    router.replace(prof?.pin_hash ? '/pin' : '/pin-setup');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={GRADIENT_HEADER} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💳</Text>
            </View>
            <Text style={styles.appName}>Kasir ATM</Text>
            <Text style={styles.appSub}>Pembukuan Digital • Aman & Tersimpan di Cloud</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk ke Akun</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@kamu.com"
              placeholderTextColor={colors.gray400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.gray400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={doLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.btnText}>Masuk</Text>
              }
            </TouchableOpacity>

            <Text style={styles.note}>
              Tidak bisa daftar sendiri. Hubungi admin untuk mendapatkan akses.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: 6, letterSpacing: 0.3 },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  card: {
    backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.gray800, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12,
    padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 14,
  },
  btn: {
    backgroundColor: colors.blue, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  note: { fontSize: 12, color: colors.gray500, textAlign: 'center', marginTop: 16 },
  });
}
