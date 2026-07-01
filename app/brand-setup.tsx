import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/lib/ThemeContext';
import { pauseRelock, resumeRelock } from '../src/lib/appLock';
import { savePengaturan } from '../src/lib/safeSave';

/**
 * Upload logo (base64) ke Supabase Storage lalu panggil Edge Function
 * "request-build" supaya GitHub Actions bikinkan APK baru dengan
 * nama & ikon homescreen sesuai branding ini.
 *
 * PENTING: ini memicu build APK baru (butuh ~10-20 menit di server EAS).
 * User TIDAK langsung dapat APK-nya di sini — nanti dicek statusnya
 * (ready / building / failed) di layar Pengaturan, lalu di-download
 * & install manual saat sudah "ready".
 */
async function triggerCustomBuild(appName: string, logoBase64: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi tidak ditemukan');

  // logoBase64 formatnya "data:image/jpeg;base64,xxxx"
  const [meta, base64Data] = logoBase64.split(',');
  const ext = meta.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/logo-${Date.now()}.${ext}`;

  const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const { error: uploadErr } = await supabase.storage
    .from('app-logos')
    .upload(path, byteArray, { contentType: meta.includes('png') ? 'image/png' : 'image/jpeg', upsert: true });
  if (uploadErr) throw new Error(uploadErr.message);

  const { data: publicUrlData } = supabase.storage.from('app-logos').getPublicUrl(path);

  const { data: sessionData } = await supabase.auth.getSession();
  const res = await fetch(`${(supabase as any).supabaseUrl}/functions/v1/request-build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session?.access_token}`,
    },
    body: JSON.stringify({ app_name: appName, logo_url: publicUrlData.publicUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Gagal memicu build custom');
  }
}

export default function BrandSetupScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ target?: string }>();
  const target = params.target || '/(tabs)/dashboard';

  const [nama, setNama] = useState('Kasir ATM');
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pilihLogo = async () => {
    pauseRelock();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Izin Dibutuhkan', 'Izinkan akses galeri untuk memilih logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      setLogo(`data:${mime};base64,${asset.base64}`);
    } finally {
      resumeRelock();
    }
  };

  const simpan = async (skip = false) => {
    if (!skip && !nama.trim()) {
      return Alert.alert('Error', 'Nama warung tidak boleh kosong.');
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan, silakan login ulang.');
      const finalName = skip ? 'Kasir ATM' : nama.trim();
      const finalLogo = skip ? null : logo;
      const saved = await savePengaturan(user.id, {
        app_name: finalName,
        app_logo: finalLogo,
        brand_set: true,
        updated_at: new Date().toISOString(),
      });
      if (saved.app_name !== finalName || !!saved.brand_set !== true) {
        throw new Error('Identitas aplikasi tidak tersimpan dengan benar, coba lagi.');
      }

      // Trigger pipeline build APK custom (nama & ikon homescreen).
      // Sengaja tidak "await" & tidak melempar error kalau gagal —
      // ini proses latar belakang, tidak boleh menghalangi user lanjut
      // pakai aplikasi. Status build bisa dicek nanti di menu Pengaturan.
      if (!skip && finalLogo) {
        triggerCustomBuild(finalName, finalLogo).catch((e) =>
          console.warn('Gagal trigger build custom:', e.message)
        );
      }

      router.replace(target as any);
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi. Pastikan koneksi internet stabil.');
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={GRADIENT_HEADER} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Text style={styles.emoji}>🏪</Text>
            <Text style={styles.title}>Identitas Aplikasi</Text>
            <Text style={styles.sub}>Ganti nama & logo "Kasir ATM" sesuai warung/usaha kamu. Bisa diubah lagi nanti di Pengaturan.</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.logoPicker} onPress={pilihLogo}>
              {logo
                ? <Image source={{ uri: logo }} style={styles.logoImg} />
                : <Text style={styles.logoPlaceholder}>💳</Text>
              }
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>{logo ? 'Ganti' : 'Pilih Logo'}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Nama Warung / Usaha</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: ATM Berkah Jaya"
              placeholderTextColor={colors.gray400}
              value={nama}
              onChangeText={setNama}
              maxLength={30}
            />

            <TouchableOpacity
              style={[styles.btn, saving && { opacity: 0.7 }]}
              onPress={() => simpan(false)}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Simpan & Lanjutkan</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => simpan(true)} disabled={saving}>
              <Text style={styles.skipBtnText}>Lewati, pakai default</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  top: { alignItems: 'center', marginBottom: 24 },
  emoji: { fontSize: 38, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.white, textAlign: 'center' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', textAlign: 'center', marginTop: 6, paddingHorizontal: 12, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  logoPicker: { alignSelf: 'center', alignItems: 'center', marginBottom: 20 },
  logoImg: { width: 88, height: 88, borderRadius: 22 },
  logoPlaceholder: {
    width: 88, height: 88, borderRadius: 22, backgroundColor: colors.gray100,
    textAlign: 'center', textAlignVertical: 'center', fontSize: 38, lineHeight: 88, overflow: 'hidden',
  },
  logoBadge: { backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  logoBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12,
    padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 18,
  },
  btn: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  skipBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  skipBtnText: { color: colors.gray500, fontSize: 13, fontWeight: '600' },
});
}
