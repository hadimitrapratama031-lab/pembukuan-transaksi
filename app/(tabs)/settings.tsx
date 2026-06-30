import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, REKENING_COLORS } from '../../src/lib/theme';
import { fmtRp } from '../../src/lib/utils';

const EMOJIS = ['💳', '💵', '🏦', '📱', '💰', '🟢', '🔵', '🟠'];
const COLOR_KEYS = Object.keys(REKENING_COLORS);

export default function SettingsScreen() {
  const [rekening, setRekening] = useState<any[]>([]);
  const [feesTU, setFeesTU] = useState<number[]>([]);
  const [feesTF, setFeesTF] = useState<number[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Rekening modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [emoji, setEmoji] = useState('💳');
  const [warna, setWarna] = useState('bg-blue');
  const [saldo, setSaldo] = useState('');
  const [tipe, setTipe] = useState<'digital' | 'cash' | 'bank'>('digital');
  const [saving, setSaving] = useState(false);

  // Fee input state
  const [newFeeTU, setNewFeeTU] = useState('');
  const [newFeeTF, setNewFeeTF] = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
    setLoading(false);
  };

  const openAddModal = () => {
    setEditId(null);
    setNama(''); setEmoji('💳'); setWarna('bg-blue'); setSaldo(''); setTipe('digital');
    setModalVisible(true);
  };

  const openEditModal = (r: any) => {
    setEditId(r.id);
    setNama(r.nama); setEmoji(r.emoji || '💳'); setWarna(r.warna || 'bg-blue');
    setSaldo(String(r.saldo)); setTipe(r.tipe || 'digital');
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
          nama: nama.trim(), emoji, warna, tipe, saldo: Number(saldo), updated_at: new Date().toISOString()
        }).eq('id', editId);
      } else {
        await supabase.from('rekening').insert({
          user_id: user!.id, nama: nama.trim(), emoji, warna, tipe,
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

  const addFee = async (type: 'TU' | 'TF') => {
    const val = Number(type === 'TU' ? newFeeTU : newFeeTF);
    if (!val || val <= 0) return Alert.alert('Error', 'Masukkan nominal yang valid');
    const { data: { user } } = await supabase.auth.getUser();
    const key = type === 'TU' ? 'fees_tu' : 'fees_tf';
    const current = [...(type === 'TU' ? feesTU : feesTF)];
    if (current.includes(val)) return Alert.alert('Error', 'Nominal sudah ada');
    current.push(val); current.sort((a, b) => a - b);
    await supabase.from('pengaturan').update({ [key]: current }).eq('user_id', user!.id);
    if (type === 'TU') { setFeesTU(current); setNewFeeTU(''); }
    else { setFeesTF(current); setNewFeeTF(''); }
  };

  const removeFee = async (type: 'TU' | 'TF', idx: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    const key = type === 'TU' ? 'fees_tu' : 'fees_tf';
    const current = [...(type === 'TU' ? feesTU : feesTF)];
    current.splice(idx, 1);
    await supabase.from('pengaturan').update({ [key]: current }).eq('user_id', user!.id);
    if (type === 'TU') setFeesTU(current); else setFeesTF(current);
  };

  const resetModal = () => {
    Alert.alert('Reset Modal', 'Reset semua saldo rekening ke modal awal?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: async () => {
          for (const r of rekening) {
            await supabase.from('rekening').update({ saldo: r.modal_awal || 0 }).eq('id', r.id);
          }
          loadData();
          Alert.alert('✅ Berhasil', 'Modal direset ke awal');
        }
      },
    ]);
  };

  const clearAllTx = () => {
    Alert.alert('Hapus Semua Transaksi', 'Yakin? Data transaksi tidak bisa dikembalikan!', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('transaksi').delete().eq('user_id', user!.id);
          await supabase.from('pengaturan').update({ total_keuntungan: 0 }).eq('user_id', user!.id);
          Alert.alert('✅ Berhasil', 'Semua transaksi dihapus');
        }
      },
    ]);
  };

  const doLogout = () => {
    Alert.alert('Keluar', 'Keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) return (
    <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Pengaturan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Rekening */}
        <Text style={styles.sectionTitle}>REKENING MODAL</Text>
        {rekening.map(r => (
          <View key={r.id} style={styles.settingsItem}>
            <View style={styles.rekLeft}>
              <View style={[styles.badgeColor, { backgroundColor: REKENING_COLORS[r.warna] || '#dbeafe' }]}>
                <Text>{r.emoji || '💳'}</Text>
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
        <TouchableOpacity style={styles.outlineBtn} onPress={openAddModal}>
          <Text style={styles.outlineBtnText}>+ Tambah Rekening</Text>
        </TouchableOpacity>

        {/* Fee TU */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>BIAYA ADMIN — TARIK TUNAI</Text>
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {feesTU.map((f, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{fmtRp(f)}</Text>
                <TouchableOpacity onPress={() => removeFee('TU', i)}>
                  <Text style={styles.chipDel}>×</Text>
                </TouchableOpacity>
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
        </View>

        {/* Fee TF */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>BIAYA ADMIN — TRANSFER</Text>
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {feesTF.map((f, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{fmtRp(f)}</Text>
                <TouchableOpacity onPress={() => removeFee('TF', i)}>
                  <Text style={styles.chipDel}>×</Text>
                </TouchableOpacity>
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

        {/* Akun */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>AKUN</Text>
        <View style={styles.card}>
          <Text style={styles.itemName}>{profile?.nama || 'Admin'}</Text>
          <Text style={[styles.itemSub, { marginBottom: 12 }]}>{userEmail}</Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={doLogout}>
            <Text style={styles.outlineBtnText}>🚪 Keluar</Text>
          </TouchableOpacity>
        </View>

        {/* Lainnya */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>LAINNYA</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={resetModal}>
          <Text style={styles.outlineBtnText}>🔄 Reset Modal ke Awal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineBtn, styles.dangerBtn, { marginTop: 8 }]} onPress={clearAllTx}>
          <Text style={styles.dangerBtnText}>🗑️ Hapus Semua Transaksi</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Tambah/Edit Rekening */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editId ? 'Edit Rekening' : 'Tambah Rekening'}</Text>

              <Text style={styles.label}>Nama Rekening</Text>
              <TextInput
                style={styles.input} placeholder="Contoh: DANA, Cash, SeaBank"
                placeholderTextColor={colors.gray400} value={nama} onChangeText={setNama}
              />

              <Text style={styles.label}>Emoji / Ikon</Text>
              <View style={styles.emojiWrap}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                    onPress={() => setEmoji(e)}
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

              <Text style={styles.label}>Saldo Awal (Modal)</Text>
              <TextInput
                style={styles.input} placeholder="Contoh: 1000000"
                placeholderTextColor={colors.gray400} keyboardType="numeric"
                value={saldo} onChangeText={setSaldo}
              />

              <Text style={styles.label}>Tipe Rekening</Text>
              <View style={styles.tipeWrap}>
                {([['digital', 'Digital'], ['cash', 'Cash'], ['bank', 'Bank']] as const).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.tipeBtn, tipe === val && styles.tipeBtnActive]}
                    onPress={() => setTipe(val)}
                  >
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
                  {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Simpan</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { backgroundColor: colors.blueDark, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 10 },
  settingsItem: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  rekLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  badgeColor: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  itemSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  smBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.gray200 },
  smBtnText: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  smBtnDanger: { backgroundColor: colors.red, borderColor: colors.red },
  smBtnDangerText: { fontSize: 12, fontWeight: '600', color: colors.white },
  outlineBtn: { backgroundColor: colors.white, borderRadius: 8, padding: 13, alignItems: 'center', borderWidth: 1.5, borderColor: colors.gray200 },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  dangerBtn: { backgroundColor: colors.red, borderColor: colors.red },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gray100, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.gray800 },
  chipDel: { fontSize: 16, color: colors.gray400 },
  addFeeRow: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 8, padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 12 },
  addFeeBtn: { backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addFeeBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  emojiBtn: { padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  emojiBtnActive: { backgroundColor: colors.gray100, borderColor: colors.blue },
  colorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  colorBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: colors.gray800 },
  tipeWrap: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tipeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: colors.gray200, alignItems: 'center' },
  tipeBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tipeBtnText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  tipeBtnTextActive: { color: colors.white },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 20 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnOutline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.gray200 },
  btnPrimary: { backgroundColor: colors.blue },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.white },
});
