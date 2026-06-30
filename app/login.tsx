import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login Gagal', error.message.includes('Invalid login')
        ? 'Email atau password salah.' : error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>💰</Text>
          <Text style={styles.appName}>Kasir ATM</Text>
          <Text style={styles.appSub}>Pembukuan Mini ATM — Aman & Tersimpan di Cloud</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔐 Masuk ke Akun</Text>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.blueDark,
    padding: 24,
    justifyContent: 'center',
  },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 64, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: '800', color: colors.white, marginBottom: 6 },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
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
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 8,
    padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 14,
  },
  btn: {
    backgroundColor: colors.blue, borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  note: { fontSize: 12, color: colors.gray500, textAlign: 'center', marginTop: 16 },
});
