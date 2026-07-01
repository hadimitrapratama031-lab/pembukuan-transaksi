import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';
import { useTheme } from '../src/lib/ThemeContext';
import { verifyPin } from '../src/lib/pin';
import { setUnlocked } from '../src/lib/appLock';
import { PinDots, PinKeypad } from '../src/components/PinPad';

const PIN_LEN = 6;

export default function PinScreen() {
  const { GRADIENT_HEADER } = useTheme();
  const [pin, setPin] = useState('');
  const [userId, setUserId] = useState('');
  const [storedHash, setStoredHash] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('pin_hash, nama, role').eq('id', user.id).single();
      if (!prof?.pin_hash) { router.replace('/pin-setup'); return; }
      setUserId(user.id);
      setStoredHash(prof.pin_hash);
      setUserName(prof.nama || '');
      setRole(prof.role || 'staff');
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (pin.length === PIN_LEN && !checking) doVerify();
  }, [pin]);

  const doVerify = async () => {
    setChecking(true);
    const ok = await verifyPin(pin, userId, storedHash);
    if (ok) {
      setUnlocked(true);
      // Akun admin selalu ditanya dulu mau masuk sebagai Staff atau Admin.
      // Akun staff biasa langsung ke app transaksi seperti biasa.
      router.replace((role === 'admin' ? '/mode-select' : '/(tabs)/dashboard') as any);
    } else {
      Alert.alert('PIN Salah', 'PIN yang kamu masukkan salah, coba lagi.');
      setPin('');
    }
    setChecking(false);
  };

  const doLogout = () => {
    Alert.alert('Keluar', 'Keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/login'); } },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <LinearGradient colors={GRADIENT_HEADER} style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.lock}>🔒</Text>
        <Text style={styles.title}>Masukkan PIN</Text>
        <Text style={styles.sub}>Halo, {userName}</Text>
        <PinDots length={PIN_LEN} filled={pin.length} />
        {checking && <ActivityIndicator color={colors.white} style={{ marginBottom: 12 }} />}
      </View>
      <View style={styles.bottom}>
        <PinKeypad
          onPress={(d) => { if (pin.length < PIN_LEN) setPin(pin + d); }}
          onDelete={() => setPin(pin.slice(0, -1))}
        />
        <Text style={styles.logout} onPress={doLogout}>Bukan kamu? Keluar</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  lock: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.white, marginTop: 12 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  bottom: { paddingBottom: 40 },
  logout: { textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8, fontWeight: '600' },
});
