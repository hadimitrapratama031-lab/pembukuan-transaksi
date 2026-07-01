import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../src/lib/theme';
import { useTheme } from '../src/lib/ThemeContext';
import { setMode } from '../src/lib/appMode';

// Khusus akun admin: tanya dulu mau masuk sebagai Staff (app transaksi normal)
// atau Admin (Panel Admin doang, tanpa tab Dashboard/Tarik/Transfer/Riwayat/Laporan).
export default function ModeSelectScreen() {
  const { GRADIENT_HEADER } = useTheme();
  const pilihStaff = () => {
    setMode('staff');
    router.replace('/(tabs)/dashboard');
  };

  const pilihAdmin = () => {
    setMode('admin');
    router.replace('/admin' as any);
  };

  return (
    <LinearGradient colors={GRADIENT_HEADER} style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.icon}>👑</Text>
        <Text style={styles.title}>Masuk sebagai apa?</Text>
        <Text style={styles.sub}>Akun ini punya akses Admin. Pilih mode yang mau dipakai sekarang.</Text>

        <TouchableOpacity style={styles.card} onPress={pilihStaff} activeOpacity={0.85}>
          <Text style={styles.cardIcon}>🧾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Staff</Text>
            <Text style={styles.cardSub}>Catat transaksi harian — Dashboard, Tarik Tunai, Transfer, Riwayat, Laporan</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={pilihAdmin} activeOpacity={0.85}>
          <Text style={styles.cardIcon}>🛠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Admin</Text>
            <Text style={styles.cardSub}>Kelola akun staff/mitra — tanpa fitur transaksi</Text>
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  icon: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.white, marginTop: 12, textAlign: 'center' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, textAlign: 'center', marginBottom: 28 },
  card: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  cardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
