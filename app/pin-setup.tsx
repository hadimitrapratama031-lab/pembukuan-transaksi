import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/lib/ThemeContext';
import { hashPin, verifyPin } from '../src/lib/pin';
import { setUnlocked } from '../src/lib/appLock';
import { saveProfile } from '../src/lib/safeSave';
import { PinDots, PinKeypad } from '../src/components/PinPad';

const PIN_LEN = 6;
type Step = 'old' | 'new' | 'confirm';

export default function PinSetupScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ mode?: string; from?: string }>();
  const isChange = params.mode === 'change';
  const cameFromAdmin = params.from === 'admin';

  const [userId, setUserId] = useState('');
  const [oldHash, setOldHash] = useState<string | null>(null);
  const [fallbackNama, setFallbackNama] = useState('Admin');
  const [role, setRole] = useState('staff');
  const [brandSet, setBrandSet] = useState(true);
  const [step, setStep] = useState<Step>(isChange ? 'old' : 'new');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: prof } = await supabase.from('profiles').select('pin_hash, role, nama').eq('id', user.id).single();
      const { data: peng } = await supabase.from('pengaturan').select('brand_set').eq('user_id', user.id).single();
      setUserId(user.id);
      setOldHash(prof?.pin_hash || null);
      setRole(prof?.role || 'staff');
      setFallbackNama(prof?.nama || (user.email ? user.email.split('@')[0] : 'Admin'));
      setBrandSet(!!peng?.brand_set);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (pin.length === PIN_LEN) handleStepComplete();
  }, [pin]);

  const handleStepComplete = async () => {
    if (step === 'old') {
      const ok = await verifyPin(pin, userId, oldHash || '');
      if (!ok) { Alert.alert('PIN Salah', 'PIN lama tidak cocok.'); setPin(''); return; }
      setStep('new'); setPin('');
      return;
    }
    if (step === 'new') {
      setFirstPin(pin); setStep('confirm'); setPin('');
      return;
    }
    if (step === 'confirm') {
      if (pin !== firstPin) {
        Alert.alert('Tidak Cocok', 'PIN konfirmasi tidak sama, ulangi dari awal.');
        setStep('new'); setFirstPin(''); setPin('');
        return;
      }
      setBusy(true);
      try {
        const hash = await hashPin(pin, userId);
        const saved = await saveProfile(userId, { pin_hash: hash, nama: fallbackNama });
        // Verifikasi ekstra: pastikan hash yang baru tersimpan memang sama
        // dengan yang baru saja dibuat, bukan cuma "tidak error".
        if (saved.pin_hash !== hash) {
          throw new Error('PIN tidak tersimpan dengan benar, coba lagi.');
        }
        setUnlocked(true);

        let target = '/(tabs)/dashboard';
        if (isChange) {
          target = cameFromAdmin ? '/admin' : '/(tabs)/settings';
        } else if (role === 'admin') {
          // Akun admin yang baru pertama kali bikin PIN tetap ditanya dulu mau masuk sebagai apa.
          target = '/mode-select';
        }

        if (!isChange && !brandSet) {
          // Pertama kali bikin PIN & belum pernah isi identitas app → minta isi dulu.
          router.replace(`/brand-setup?target=${encodeURIComponent(target)}` as any);
          return;
        }

        Alert.alert('✅ Berhasil', isChange ? 'PIN berhasil diubah.' : 'PIN berhasil dibuat.', [
          { text: 'OK', onPress: () => router.replace(target as any) },
        ]);
      } catch (e: any) {
        Alert.alert('Gagal Menyimpan PIN', e.message || 'Terjadi kesalahan, coba lagi. Pastikan koneksi internet stabil.');
        setPin('');
      } finally {
        setBusy(false);
      }
      return;
    }
  };

  const titles: Record<Step, string> = {
    old: 'Masukkan PIN Lama',
    new: isChange ? 'Buat PIN Baru' : 'Buat PIN Keamanan',
    confirm: 'Ulangi PIN Baru',
  };
  const subs: Record<Step, string> = {
    old: 'Verifikasi dulu sebelum mengganti PIN',
    new: 'PIN ini dipakai setiap kamu buka aplikasi',
    confirm: 'Masukkan sekali lagi untuk konfirmasi',
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
        <Text style={styles.lock}>🔐</Text>
        <Text style={styles.title}>{titles[step]}</Text>
        <Text style={styles.sub}>{subs[step]}</Text>
        <PinDots length={PIN_LEN} filled={pin.length} />
        {busy && <ActivityIndicator color={colors.white} style={{ marginBottom: 12 }} />}
      </View>
      <View style={styles.bottom}>
        <PinKeypad
          onPress={(d) => { if (pin.length < PIN_LEN) setPin(pin + d); }}
          onDelete={() => setPin(pin.slice(0, -1))}
        />
        {!isChange && <Text style={styles.note}>PIN wajib dibuat agar data lebih aman.</Text>}
      </View>
    </LinearGradient>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  lock: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.white, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  bottom: { paddingBottom: 40 },
  note: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 },
});
}
