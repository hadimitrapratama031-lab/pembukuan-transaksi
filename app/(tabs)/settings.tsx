import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, Image
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { REKENING_COLORS } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { THEME_OPTIONS } from '../../src/lib/theme';
import { fmtRp } from '../../src/lib/utils';
import { setUnlocked, pauseRelock, resumeRelock } from '../../src/lib/appLock';
import { setMode } from '../../src/lib/appMode';
import { savePengaturan } from '../../src/lib/safeSave';
import { detectBrand, resolveBrandLogo } from '../../src/lib/brandMap';
import PinConfirmModal from '../../src/components/PinConfirmModal';

const EMOJIS = ['💳', '💵', '🏦', '📱', '💰', '🟢', '🔵', '🟠'];
const COLOR_KEYS = Object.keys(REKENING_COLORS);

export default function SettingsScreen() {
  const { colors, GRADIENT_HEADER, themeKey, setThemeKey } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rekening, setRekening] = useState<any[]>([]);
  const [feesTU, setFeesTU] = useState<number[]>([]);
  const [feesTF, setFeesTF] = useState<number[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Identitas aplikasi (nama warung & logo)
  const [appName, setAppName] = useState('Kasir ATM');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [brandNama, setBrandNama] = useState('');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandDirty, setBrandDirty] = useState(false);

  // Rekening modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [emoji, setEmoji] = useState('💳');
  const [warna, setWarna] = useState('bg-blue');
  const [saldo, setSaldo] = useState('');
  const [tipe, setTipe] = useState<'digital' | 'cash' | 'bank'>('digital');
  const [saving, setSaving] = useState(false);
  const [rekeningLogoUrl, setRekeningLogoUrl] = useState<string | null>(null); // logo brand otomatis
  const [showCustomize, setShowCustomize] = useState(false); // tampilkan picker emoji/warna manual

  // Fee input state
  const [newFeeTU, setNewFeeTU] = useState('');
  const [newFeeTF, setNewFeeTF] = useState('');

  // PIN confirm sebelum aksi berbahaya (reset modal / hapus transaksi / hapus rekening)
  const [userId, setUserId] = useState('');
  const [pinConfirmVisible, setPinConfirmVisible] = useState(false);
  const [pinConfirmAction, setPinConfirmAction] = useState<(() => void) | null>(null);

  const askPinThenRun = (action: () => void) => {
    if (!profile) {
      // Profil gagal/belum termuat — JANGAN langsung jalankan aksi berbahaya tanpa PIN.
      // Minta user reload dulu supaya PIN benar-benar bisa diverifikasi.
      Alert.alert('Belum Siap', 'Data akun belum termuat sempurna. Tutup & buka lagi halaman Pengaturan, lalu coba ulangi.');
      return;
    }
    if (!profile?.pin_hash) {
      // Kasus sah: akun ini memang belum pernah membuat PIN sama sekali.
      action();
      return;
    }
    setPinConfirmAction(() => action);
    setPinConfirmVisible(true);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setUserEmail(user.email || '');

    const [{ data: rek }, { data: peng }, { data: prof }] = await Promise.all([
      supabase.from('rekening').select('*').eq('user_id', user.id).order('urutan'),
      supabase.from('pengaturan').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);
    setRekening(rek || []);
    setFeesTU(peng?.fees_tu || [3000, 5000, 10000]);
    setFeesTF(peng?.fees_tf || [3000, 5000, 10000]);
    setProfile(prof);

    const curName = peng?.app_name || 'Kasir ATM';
    const curLogo = peng?.app_logo || null;
    setAppName(curName);
    setAppLogo(curLogo);
    setBrandNama(curName);
    setBrandLogo(curLogo);
    setBrandDirty(false);
    setLoading(false);
  };

  // ---------- Identitas Aplikasi ----------
  const pilihLogoBaru = async () => {
    pauseRelock();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Izin Dibutuhkan', 'Izinkan akses galeri untuk memilih logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      setBrandLogo(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
      setBrandDirty(true);
    } finally {
      resumeRelock();
    }
  };

  const simpanBranding = async () => {
    if (!brandNama.trim()) return Alert.alert('Error', 'Nama warung tidak boleh kosong.');
    setBrandSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan, silakan login ulang.');
      const finalName = brandNama.trim();
      await savePengaturan(user.id, {
        app_name: finalName,
        app_logo: brandLogo,
        brand_set: true,
        updated_at: new Date().toISOString(),
      });
      // Update state lokal HANYA setelah data benar-benar tersimpan.
      setAppName(finalName);
      setAppLogo(brandLogo);
      setBrandDirty(false);
      Alert.alert('✅ Tersimpan', 'Nama & logo aplikasi berhasil diperbarui.');
    } catch (e: any) {
      Alert.alert('Gagal Menyimpan', e.message || 'Terjadi kesalahan, coba lagi. Pastikan koneksi internet stabil.');
    }
    setBrandSaving(false);
  };

  // ---------- Rekening ----------
  const openAddModal = () => {
    setEditId(null);
    setNama(''); setEmoji('💳'); setWarna('bg-blue'); setSaldo(''); setTipe('digital');
    setRekeningLogoUrl(null);
    setShowCustomize(false);
    setModalVisible(true);
  };

  const openEditModal = (r: any) => {
    setEditId(r.id);
    setNama(r.nama); setEmoji(r.emoji || '💳'); setWarna(r.warna || 'bg-blue');
    setSaldo(String(r.saldo)); setTipe(r.tipe || 'digital');
    // Pakai logo yang sudah tersimpan; kalau rekening lama belum punya logo_url,
    // coba deteksi ulang dari nama supaya tetap tampil otomatis.
    const savedLogo = r.logo_url || detectBrand(r.nama || '')?.logoUrl || null;
    setRekeningLogoUrl(savedLogo);
    // Kalau brand-nya tidak terdeteksi otomatis, langsung tampilkan picker manual
    // supaya user bisa lihat & ubah ikon/warna yang sudah dipakai sekarang.
    setShowCustomize(!savedLogo);
    setModalVisible(true);
  };

  const simpanRekening = async () => {
    if (!nama.trim()) return Alert.alert('Error', 'Masukkan nama rekening');
    if (isNaN(Number(saldo)) || Number(saldo) < 0) return Alert.alert('Error', 'Masukkan saldo awal yang valid');

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      if (editId) {
        await supabase.from('rekening').update({
          nama: nama.trim(), emoji, warna, tipe, saldo: Number(saldo),
          logo_url: rekeningLogoUrl, updated_at: new Date().toISOString()
        }).eq('id', editId);
      } else {
        await supabase.from('rekening').insert({
          user_id: user!.id, nama: nama.trim(), emoji, warna, tipe,
          logo_url: rekeningLogoUrl,
          saldo: Number(saldo), modal_awal: Number(saldo), urutan: rekening.length,
        });
      }
      setModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    }
    setSaving(false);
  };

  const hapusRekening = (r: any) => {
    Alert.alert('Hapus Rekening', `Hapus rekening "${r.nama}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          await supabase.from('rekening').delete().eq('id', r.id);
          loadData();
        }
      },
    ]);
  };

  // ---------- Biaya Admin ----------
  const addFee = async (type: 'TU' | 'TF') => {
    const val = Number(type === 'TU' ? newFeeTU : newFeeTF);
    if (!val || val <= 0) return Alert.alert('Error', 'Masukkan nominal yang valid');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'Sesi tidak ditemukan, silakan login ulang.');
    const key = type === 'TU' ? 'fees_tu' : 'fees_tf';
    const current = [...(type === 'TU' ? feesTU : feesTF)];
    if (current.includes(val)) return Alert.alert('Error', 'Nominal sudah ada');
    current.push(val); current.sort((a, b) => a - b);
    try {
      await savePengaturan(user.id, { [key]: current });
      if (type === 'TU') { setFeesTU(current); setNewFeeTU(''); }
      else { setFeesTF(current); setNewFeeTF(''); }
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const removeFee = async (type: 'TU' | 'TF', idx: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'Sesi tidak ditemukan, silakan login ulang.');
    const key = type === 'TU' ? 'fees_tu' : 'fees_tf';
    const current = [...(type === 'TU' ? feesTU : feesTF)];
    current.splice(idx, 1);
    try {
      await savePengaturan(user.id, { [key]: current });
      if (type === 'TU') setFeesTU(current); else setFeesTF(current);
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  // ---------- Aksi berbahaya ----------
  const resetModal = () => {
    if (rekening.length === 0) {
      return Alert.alert('Tidak Ada Rekening', 'Belum ada rekening untuk direset.');
    }
    Alert.alert('Reset Modal', 'Reset semua saldo rekening ke modal awal?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => askPinThenRun(doResetModal) },
    ]);
  };

  const doResetModal = async () => {
    try {
      const results = await Promise.all(
        rekening.map(r =>
          supabase.from('rekening')
            .update({ saldo: r.modal_awal ?? 0, updated_at: new Date().toISOString() })
            .eq('id', r.id)
        )
      );
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
      await loadData();
      Alert.alert('✅ Berhasil', 'Semua saldo rekening sudah direset ke modal awal masing-masing.');
    } catch (e: any) {
      Alert.alert('Gagal Reset Modal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const clearAllTx = () => {
    Alert.alert('Hapus Semua Transaksi', 'Yakin? Data transaksi tidak bisa dikembalikan!', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => askPinThenRun(doClearAllTx) },
    ]);
  };

  const doClearAllTx = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan, silakan login ulang.');
      const { error: e1 } = await supabase.from('transaksi').delete().eq('user_id', user.id);
      if (e1) throw e1;
      await savePengaturan(user.id, { total_keuntungan: 0 });
      Alert.alert('✅ Berhasil', 'Semua transaksi dihapus.');
    } catch (e: any) {
      Alert.alert('Gagal Hapus Transaksi', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const hapusSemuaRekening = () => {
    if (rekening.length === 0) {
      return Alert.alert('Tidak Ada Rekening', 'Belum ada rekening untuk dihapus.');
    }
    Alert.alert(
      'Hapus Semua Rekening & Modal',
      'Semua rekening modal akan dihapus permanen. Riwayat transaksi lama tetap tersimpan (hanya kehilangan tautan ke rekening), tapi kamu harus tambah rekening baru dari awal. Yakin?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus Semua', style: 'destructive', onPress: () => askPinThenRun(doHapusSemuaRekening) },
      ]
    );
  };

  const doHapusSemuaRekening = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan, silakan login ulang.');
      const { error } = await supabase.from('rekening').delete().eq('user_id', user.id);
      if (error) throw error;
      await loadData();
      Alert.alert('✅ Berhasil', 'Semua rekening & modal sudah dihapus.');
    } catch (e: any) {
      Alert.alert('Gagal Hapus Rekening', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const doLogout = () => {
    Alert.alert('Keluar', 'Keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive', onPress: async () => {
          setUnlocked(false);
          setMode(null);
          await supabase.auth.signOut();
          router.replace('/login');
        }
      },
    ]);
  };

  if (loading) return (
    <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  const isAdmin = profile?.role === 'admin';

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENT_HEADER} style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Pengaturan</Text>
        <Text style={styles.headerSub}>{appName}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ===== Identitas Aplikasi ===== */}
        <Text style={styles.sectionTitle}>IDENTITAS APLIKASI</Text>
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <TouchableOpacity style={styles.brandLogoPicker} onPress={pilihLogoBaru}>
              {brandLogo
                ? <Image source={{ uri: brandLogo }} style={styles.brandLogoImg} />
                : <Text style={styles.brandLogoEmoji}>💳</Text>
              }
              <View style={styles.brandLogoEditDot}><Text style={styles.brandLogoEditDotText}>✎</Text></View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nama Warung / Usaha</Text>
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                placeholder="Contoh: ATM Berkah Jaya"
                placeholderTextColor={colors.gray400}
                value={brandNama}
                maxLength={30}
                onChangeText={(v) => { setBrandNama(v); setBrandDirty(true); }}
              />
            </View>
          </View>
          <Text style={styles.brandHint}>Nama & logo ini akan tampil di halaman Beranda menggantikan "Kasir ATM".</Text>
          {brandDirty && (
            <TouchableOpacity
              style={[styles.addFeeBtnFull, brandSaving && { opacity: 0.7 }]}
              onPress={simpanBranding} disabled={brandSaving}
            >
              {brandSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.addFeeBtnText}>Simpan Perubahan</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* ===== Tema Warna ===== */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>TEMA WARNA</Text>
        <View style={styles.card}>
          <Text style={styles.brandHint}>Pilih warna aksen aplikasi sesuai selera kamu.</Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={styles.themeOption}
                onPress={() => setThemeKey(t.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.themeSwatch, { backgroundColor: t.swatch }, themeKey === t.key && styles.themeSwatchActive]}>
                  {themeKey === t.key && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.themeLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ===== Rekening ===== */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>REKENING MODAL</Text>
        <View style={styles.card}>
          {rekening.length === 0 && (
            <Text style={styles.emptyText}>Belum ada rekening.</Text>
          )}
          {rekening.map((r, i) => (
            <View key={r.id} style={[styles.settingsItem, i === rekening.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
              <View style={styles.rekLeft}>
                <View style={[styles.badgeColor, { backgroundColor: REKENING_COLORS[r.warna] || colors.iconBlueBg }]}>
                  {resolveBrandLogo(r) ? (
                    <Image source={{ uri: resolveBrandLogo(r)! }} style={styles.badgeLogoImg} />
                  ) : (
                    <Text>{r.emoji || '💳'}</Text>
                  )}
                </View>
                <View>
                  <Text style={styles.itemName}>{r.nama}</Text>
                  <Text style={styles.itemSub}>{fmtRp(r.saldo)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.smBtn} onPress={() => openEditModal(r)}>
                  <Text style={styles.smBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smBtn, styles.smBtnDanger]} onPress={() => hapusRekening(r)}>
                  <Text style={styles.smBtnDangerText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.outlineBtn} onPress={openAddModal}>
          <Text style={styles.outlineBtnText}>+ Tambah Rekening</Text>
        </TouchableOpacity>

        {/* ===== Biaya Admin ===== */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>BIAYA ADMIN</Text>
        <View style={styles.card}>
          <Text style={styles.subLabel}>Tarik Tunai</Text>
          <View style={styles.chipsWrap}>
            {feesTU.length === 0 && <Text style={styles.emptyTextSm}>Belum ada nominal.</Text>}
            {feesTU.map((f, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{fmtRp(f)}</Text>
                <TouchableOpacity onPress={() => removeFee('TU', i)}><Text style={styles.chipDel}>×</Text></TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.addFeeRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Nominal baru (Rp)" placeholderTextColor={colors.gray400}
              keyboardType="numeric" value={newFeeTU} onChangeText={setNewFeeTU}
            />
            <TouchableOpacity style={styles.addFeeBtn} onPress={() => addFee('TU')}>
              <Text style={styles.addFeeBtnText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.subLabel}>Transfer</Text>
          <View style={styles.chipsWrap}>
            {feesTF.length === 0 && <Text style={styles.emptyTextSm}>Belum ada nominal.</Text>}
            {feesTF.map((f, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{fmtRp(f)}</Text>
                <TouchableOpacity onPress={() => removeFee('TF', i)}><Text style={styles.chipDel}>×</Text></TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.addFeeRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Nominal baru (Rp)" placeholderTextColor={colors.gray400}
              keyboardType="numeric" value={newFeeTF} onChangeText={setNewFeeTF}
            />
            <TouchableOpacity style={styles.addFeeBtn} onPress={() => addFee('TF')}>
              <Text style={styles.addFeeBtnText}>Tambah</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== Akun ===== */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>AKUN</Text>
        <View style={styles.card}>
          <View style={styles.acctRow}>
            <View style={styles.acctAvatar}>
              <Text style={{ fontSize: 18 }}>{isAdmin ? '👑' : '👤'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{profile?.nama || 'Admin'}</Text>
              <Text style={styles.itemSub}>{userEmail}</Text>
            </View>
            <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
              <Text style={[styles.roleBadgeText, isAdmin && styles.roleBadgeTextAdmin]}>{isAdmin ? 'Admin' : 'Staff'}</Text>
            </View>
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity style={[styles.outlineBtn, { marginTop: 8 }]} onPress={() => router.push('/admin' as any)}>
            <Text style={styles.outlineBtnText}>🛠️ Buka Panel Admin</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.outlineBtn, { marginTop: 8 }]} onPress={() => router.push('/pin-setup?mode=change')}>
          <Text style={styles.outlineBtnText}>🔐 Ubah PIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineBtn, { marginTop: 8 }]} onPress={doLogout}>
          <Text style={styles.outlineBtnText}>🚪 Keluar</Text>
        </TouchableOpacity>

        {/* ===== Zona Berbahaya ===== */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>ZONA BERBAHAYA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={resetModal}>
            <Text style={styles.dangerRowIcon}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerRowTitle}>Reset Modal ke Awal</Text>
              <Text style={styles.dangerRowSub}>Kembalikan saldo semua rekening ke modal awal.</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dangerRow} onPress={clearAllTx}>
            <Text style={styles.dangerRowIcon}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerRowTitle}>Hapus Semua Transaksi</Text>
              <Text style={styles.dangerRowSub}>Riwayat transaksi akan dihapus permanen.</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dangerRow} onPress={hapusSemuaRekening}>
            <Text style={styles.dangerRowIcon}>💣</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerRowTitle}>Hapus Semua Rekening & Modal</Text>
              <Text style={styles.dangerRowSub}>Semua rekening modal akan dihapus permanen.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Tambah/Edit Rekening */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHandle} />
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{editId ? 'Edit Rekening' : 'Tambah Rekening'}</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)} hitSlop={8}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Preview langsung — berubah real-time sesuai input di bawah */}
              <View style={styles.previewCard}>
                <View style={[styles.previewIcon, { backgroundColor: REKENING_COLORS[warna] || colors.iconBlueBg }]}>
                  {rekeningLogoUrl ? (
                    <Image
                      source={{ uri: rekeningLogoUrl }}
                      style={styles.previewLogoImg}
                      onError={() => setRekeningLogoUrl(null)}
                    />
                  ) : (
                    <Text style={styles.previewEmoji}>{emoji}</Text>
                  )}
                </View>
                <Text style={styles.previewName} numberOfLines={1}>{nama.trim() || 'Nama Rekening'}</Text>
                <Text style={styles.previewSaldo}>{fmtRp(Number(saldo) || 0)}</Text>
              </View>

              <Text style={styles.label}>Nama Rekening</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: DANA, GoPay, BCA"
                placeholderTextColor={colors.gray400}
                value={nama}
                autoFocus={!editId}
                onChangeText={(v) => {
                  setNama(v);
                  const brand = detectBrand(v);
                  if (brand) {
                    setRekeningLogoUrl(brand.logoUrl);
                    setWarna(brand.warna);
                    setEmoji(brand.emoji);
                  } else {
                    setRekeningLogoUrl(null);
                  }
                }}
              />
              {rekeningLogoUrl ? (
                <Text style={styles.brandDetectedHint}>✨ Logo & warna terdeteksi otomatis</Text>
              ) : nama.trim().length > 0 ? (
                <TouchableOpacity onPress={() => setShowCustomize(true)}>
                  <Text style={styles.brandNotFoundHint}>Logo tidak dikenali — atur ikon manual di bawah ↓</Text>
                </TouchableOpacity>
              ) : null}

              {/* Toggle ikon & warna manual — disembunyikan by default biar simpel */}
              <TouchableOpacity style={styles.customizeToggle} onPress={() => setShowCustomize(s => !s)}>
                <Text style={styles.customizeToggleText}>
                  {showCustomize ? 'Sembunyikan ikon & warna' : '🎨 Ubah ikon & warna manual'}
                </Text>
                <Text style={styles.customizeToggleChevron}>{showCustomize ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showCustomize && (
                <View style={styles.customizePanel}>
                  <Text style={styles.label}>Emoji / Ikon</Text>
                  <View style={styles.emojiWrap}>
                    {EMOJIS.map(e => (
                      <TouchableOpacity
                        key={e}
                        style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                        onPress={() => { setEmoji(e); setRekeningLogoUrl(null); }}
                      >
                        <Text style={{ fontSize: 22 }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Warna</Text>
                  <View style={styles.colorWrap}>
                    {COLOR_KEYS.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorBtn,
                          { backgroundColor: REKENING_COLORS[c] },
                          warna === c && styles.colorBtnActive,
                        ]}
                        onPress={() => setWarna(c)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.label}>Saldo Awal (Modal)</Text>
              <View style={styles.saldoInputWrap}>
                <Text style={styles.saldoPrefix}>Rp</Text>
                <TextInput
                  style={styles.saldoInput}
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                  keyboardType="numeric"
                  value={saldo ? Number(saldo).toLocaleString('id-ID') : ''}
                  onChangeText={(v) => setSaldo(v.replace(/[^0-9]/g, ''))}
                />
              </View>

              <Text style={styles.label}>Tipe Rekening</Text>
              <View style={styles.tipeWrap}>
                {([['digital', 'Digital', '📱'], ['cash', 'Cash', '💵'], ['bank', 'Bank', '🏦']] as const).map(([val, label, ic]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.tipeBtn, tipe === val && styles.tipeBtnActive]}
                    onPress={() => setTipe(val)}
                  >
                    <Text style={styles.tipeBtnIcon}>{ic}</Text>
                    <Text style={[styles.tipeBtnText, tipe === val && styles.tipeBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnOutlineText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.7 }]}
                  onPress={simpanRekening} disabled={saving}
                >
                  {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Simpan Rekening</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Konfirmasi PIN sebelum aksi berbahaya */}
      <PinConfirmModal
        visible={pinConfirmVisible}
        title="Konfirmasi PIN"
        subtitle="Aksi ini tidak bisa dibatalkan. Masukkan PIN untuk lanjut."
        userId={userId}
        pinHash={profile?.pin_hash || ''}
        onCancel={() => { setPinConfirmVisible(false); setPinConfirmAction(null); }}
        onConfirmed={() => {
          setPinConfirmVisible(false);
          const action = pinConfirmAction;
          setPinConfirmAction(null);
          action?.();
        }}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 3 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 10 },
  card: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 16, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  divider: { height: 1, backgroundColor: colors.gray100, marginVertical: 12 },
  emptyText: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingVertical: 10 },
  emptyTextSm: { fontSize: 12, color: colors.gray400 },

  // Identitas aplikasi
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandLogoPicker: { position: 'relative' },
  brandLogoImg: { width: 56, height: 56, borderRadius: 14 },
  brandLogoEmoji: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.gray100, fontSize: 26, textAlign: 'center', textAlignVertical: 'center', lineHeight: 56, overflow: 'hidden' },
  brandLogoEditDot: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  brandLogoEditDotText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  brandHint: { fontSize: 11, color: colors.gray400, marginTop: 10, lineHeight: 16 },

  // Rekening / item list
  settingsItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rekLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  badgeColor: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeLogoImg: { width: 24, height: 24, borderRadius: 6 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  itemSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  smBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200 },
  smBtnText: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  smBtnDanger: { backgroundColor: colors.red, borderColor: colors.red },
  smBtnDangerText: { fontSize: 12, fontWeight: '600', color: colors.white },

  outlineBtn: { backgroundColor: colors.surface1, borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1.5, borderColor: colors.gray200 },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },

  // Biaya admin
  subLabel: { fontSize: 12, fontWeight: '700', color: colors.gray600, marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gray100, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.gray800 },
  chipDel: { fontSize: 16, color: colors.gray400 },
  addFeeRow: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12, padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 12 },
  addFeeBtn: { backgroundColor: colors.blue, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addFeeBtnFull: { backgroundColor: colors.blue, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  addFeeBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  themeOption: { alignItems: 'center', gap: 6, width: 64 },
  themeSwatch: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
  },
  themeSwatchActive: { borderColor: colors.gray800 },
  themeLabel: { fontSize: 11, color: colors.gray500, fontWeight: '600' },

  // Akun
  acctRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  acctAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.gray100 },
  roleBadgeAdmin: { backgroundColor: colors.orangeLight },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: colors.gray600 },
  roleBadgeTextAdmin: { color: colors.orange },

  // Zona berbahaya
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dangerRowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  dangerRowTitle: { fontSize: 14, fontWeight: '600', color: colors.red },
  dangerRowSub: { fontSize: 11, color: colors.gray500, marginTop: 2 },

  // Modal tambah/edit rekening
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '88%' },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: colors.gray500, fontWeight: '700' },

  // Live preview kartu rekening
  previewCard: { alignItems: 'center', backgroundColor: colors.gray50, borderRadius: 18, paddingVertical: 20, marginBottom: 18, borderWidth: 1, borderColor: colors.gray100 },
  previewIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  previewLogoImg: { width: 48, height: 48, borderRadius: 12 },
  previewEmoji: { fontSize: 30 },
  previewName: { fontSize: 15, fontWeight: '700', color: colors.gray800, maxWidth: '80%' },
  previewSaldo: { fontSize: 13, color: colors.gray500, marginTop: 2, fontWeight: '600' },

  brandDetectedHint: { fontSize: 11, color: colors.green, fontWeight: '600', marginTop: -6, marginBottom: 14 },
  brandNotFoundHint: { fontSize: 11, color: colors.blue, fontWeight: '600', marginTop: -6, marginBottom: 14 },

  customizeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  customizeToggleText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  customizeToggleChevron: { fontSize: 10, color: colors.gray400 },
  customizePanel: { backgroundColor: colors.gray50, borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 14 },

  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  emojiBtn: { padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.surface1 },
  emojiBtnActive: { backgroundColor: colors.gray100, borderColor: colors.blue },
  colorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: colors.gray800 },

  saldoInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12, marginBottom: 14, paddingHorizontal: 12 },
  saldoPrefix: { fontSize: 15, fontWeight: '700', color: colors.gray500, marginRight: 6 },
  saldoInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.gray800 },

  tipeWrap: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tipeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.gray200, alignItems: 'center', gap: 3 },
  tipeBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tipeBtnIcon: { fontSize: 16 },
  tipeBtnText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  tipeBtnTextActive: { color: colors.white },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 20 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnOutline: { backgroundColor: colors.surface1, borderWidth: 1.5, borderColor: colors.gray200 },
  btnPrimary: { backgroundColor: colors.blue },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.white },
});
}
