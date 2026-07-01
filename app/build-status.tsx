import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/lib/ThemeContext';

// Layar ini nampilin status build APK custom terakhir (dari brand-setup.tsx).
// Status: pending -> building -> ready (bisa didownload) / failed

type BuildRequest = {
  id: string;
  app_name: string;
  status: 'pending' | 'building' | 'ready' | 'failed';
  apk_url: string | null;
  error_message: string | null;
  created_at: string;
};

export default function BuildStatusScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const [row, setRow] = useState<BuildRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('build_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow(data as BuildRequest | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatest();
    // Polling tiap 15 detik selama masih pending/building — build EAS
    // biasanya makan waktu 10-20 menit, jadi tidak perlu lebih cepat dari ini.
    const interval = setInterval(() => {
      if (row?.status === 'pending' || row?.status === 'building' || !row) {
        fetchLatest();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchLatest, row?.status]);

  const statusLabel = {
    pending: 'Menyiapkan build...',
    building: 'Sedang build APK baru (±10-20 menit)...',
    ready: 'APK baru siap!',
    failed: 'Build gagal',
  };

  return (
    <LinearGradient colors={GRADIENT_HEADER} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLatest} />}
      >
        <Text style={styles.title}>Status Build Aplikasi</Text>

        {!row && !loading && (
          <Text style={styles.sub}>Belum ada build custom. Ganti nama/logo usaha di Identitas Aplikasi untuk mulai.</Text>
        )}

        {row && (
          <View style={styles.card}>
            <Text style={styles.appName}>{row.app_name}</Text>
            {(row.status === 'pending' || row.status === 'building') && (
              <ActivityIndicator style={{ marginVertical: 12 }} color={colors.white} />
            )}
            <Text style={styles.status}>{statusLabel[row.status]}</Text>

            {row.status === 'ready' && row.apk_url && (
              <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(row.apk_url!)}>
                <Text style={styles.btnText}>Download APK</Text>
              </TouchableOpacity>
            )}

            {row.status === 'failed' && (
              <Text style={styles.error}>{row.error_message || 'Terjadi kesalahan saat build.'}</Text>
            )}
          </View>
        )}

        <Text style={styles.note}>
          Setelah APK terdownload, install manual di HP (aktifkan "izinkan sumber tidak dikenal" kalau diminta).
          Nama & ikon di homescreen akan berubah sesuai APK baru ini.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, alignItems: 'center' },
  appName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  status: { color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },
  btn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#f87171', marginTop: 8, textAlign: 'center' },
  note: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 20, textAlign: 'center', lineHeight: 18 },
});
