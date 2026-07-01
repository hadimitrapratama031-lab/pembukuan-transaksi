import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/lib/ThemeContext';
import { setUnlocked } from '../src/lib/appLock';
import { setMode } from '../src/lib/appMode';

// Panel Admin: HANYA fitur admin (Kelola Akun staff/mitra, akun & PIN, logout).
// Tidak ada tab Dashboard/Tarik/Transfer/Riwayat/Laporan di sini sama sekali.
export default function AdminPanelScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    setUserEmail(user.email || '');

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);
    setLoading(false);

    if (prof?.role === 'admin') loadStaffList();
    else router.replace('/(tabs)/dashboard'); // jaga-jaga: bukan admin, jangan biarkan masuk sini
  };

  const loadStaffList = async () => {
    setStaffLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
      if (error) throw error;
      setStaffList(data?.users || []);
    } catch (e: any) {
      setStaffList([]);
    }
    setStaffLoading(false);
  };

  const openAddUserModal = () => {
    setNewNama(''); setNewEmail(''); setNewPassword('');
    setUserModalVisible(true);
  };

  const submitAddUser = async () => {
    if (!newNama.trim() || !newEmail.trim() || !newPassword) {
      return Alert.alert('Error', 'Nama, email, dan password wajib diisi');
    }
    if (newPassword.length < 6) return Alert.alert('Error', 'Password minimal 6 karakter');

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create', nama: newNama.trim(), email: newEmail.trim(), password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      Alert.alert('✅ Berhasil', `Akun "${newNama}" berhasil dibuat. Berikan email & password ini ke orangnya.`);
      setUserModalVisible(false);
      loadStaffList();
    } catch (e: any) {
      Alert.alert('Gagal Membuat Akun',
        e.message?.includes('Failed to send') || e.message?.includes('FunctionsFetchError')
          ? 'Fitur ini butuh Edge Function "admin-users" yang sudah di-deploy ke Supabase. Lihat panduan di README bagian "Kelola Akun Admin".'
          : (e.message || 'Terjadi kesalahan'));
    }
    setCreatingUser(false);
  };

  const hapusStaff = (u: any) => {
    Alert.alert('Hapus Akun', `Hapus akun "${u.nama}" (${u.email})? Semua data transaksinya akan ikut terhapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.functions.invoke('admin-users', { body: { action: 'delete', userId: u.id } });
            if (error) throw error;
            loadStaffList();
          } catch (e: any) {
            Alert.alert('Gagal', e.message || 'Terjadi kesalahan');
          }
        }
      },
    ]);
  };

  const masukSebagaiStaff = () => {
    setMode('staff');
    router.replace('/(tabs)/dashboard');
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

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENT_HEADER} style={styles.header}>
        <Text style={styles.headerTitle}>🛠️ Panel Admin</Text>
        <Text style={styles.headerSub}>{profile?.nama || 'Admin'} · {userEmail}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>KELOLA AKUN</Text>
        <View style={styles.card}>
          <Text style={styles.itemSub}>
            Buat akun untuk mitra/karyawan langsung dari sini — tanpa buka dashboard Supabase.
            Tiap akun staff punya rekening & transaksi terpisah dari akunmu.
          </Text>
        </View>
        {staffLoading ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 8 }} />
        ) : staffList.filter(u => u.role !== 'admin').length > 0 ? (
          staffList.filter(u => u.role !== 'admin').map(u => (
            <View key={u.id} style={styles.settingsItem}>
              <View style={styles.rekLeft}>
                <View style={[styles.badgeColor, { backgroundColor: colors.iconPurpleBg }]}>
                  <Text>👤</Text>
                </View>
                <View>
                  <Text style={styles.itemName}>{u.nama}</Text>
                  <Text style={styles.itemSub}>{u.email}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.smBtn, styles.smBtnDanger]} onPress={() => hapusStaff(u)}>
                <Text style={styles.smBtnDangerText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.itemSub, { marginBottom: 8 }]}>Belum ada akun staff/mitra.</Text>
        )}
        <TouchableOpacity style={styles.outlineBtn} onPress={openAddUserModal}>
          <Text style={styles.outlineBtnText}>+ Tambah Akun User</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>AKUN</Text>
        <View style={styles.card}>
          <Text style={styles.itemName}>{profile?.nama || 'Admin'}</Text>
          <Text style={[styles.itemSub, { marginBottom: 4 }]}>{userEmail}</Text>
          <Text style={[styles.itemSub, { marginBottom: 12 }]}>Peran: 👑 Admin</Text>
          <TouchableOpacity style={[styles.outlineBtn, { marginBottom: 8 }]} onPress={() => router.push('/pin-setup?mode=change&from=admin' as any)}>
            <Text style={styles.outlineBtnText}>🔐 Ubah PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineBtn, { marginBottom: 8 }]} onPress={masukSebagaiStaff}>
            <Text style={styles.outlineBtnText}>🧾 Masuk sebagai Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={doLogout}>
            <Text style={styles.outlineBtnText}>🚪 Keluar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={userModalVisible} transparent animationType="slide" onRequestClose={() => setUserModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Tambah Akun User</Text>

              <Text style={styles.label}>Nama</Text>
              <TextInput
                style={styles.input} placeholder="Contoh: Budi (Karyawan Toko A)"
                placeholderTextColor={colors.gray400} value={newNama} onChangeText={setNewNama}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input} placeholder="email@contoh.com"
                placeholderTextColor={colors.gray400} value={newEmail} onChangeText={setNewEmail}
                autoCapitalize="none" keyboardType="email-address"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input} placeholder="Minimal 6 karakter"
                placeholderTextColor={colors.gray400} value={newPassword} onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={[styles.itemSub, { marginBottom: 14 }]}>
                Akun ini akan punya data rekening & transaksi terpisah dari akunmu.
              </Text>

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setUserModalVisible(false)}>
                  <Text style={styles.btnOutlineText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, creatingUser && { opacity: 0.7 }]}
                  onPress={submitAddUser} disabled={creatingUser}
                >
                  {creatingUser ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Buat Akun</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 10 },
  settingsItem: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  rekLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  badgeColor: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  itemSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  smBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200 },
  smBtnText: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  smBtnDanger: { backgroundColor: colors.red, borderColor: colors.red },
  smBtnDangerText: { fontSize: 12, fontWeight: '600', color: colors.white },
  outlineBtn: { backgroundColor: colors.surface1, borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1.5, borderColor: colors.gray200 },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  card: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 16, padding: 14, marginBottom: 8, elevation: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12, padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 20 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnOutline: { backgroundColor: colors.surface1, borderWidth: 1.5, borderColor: colors.gray200 },
  btnPrimary: { backgroundColor: colors.blue },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.white },
});
}
