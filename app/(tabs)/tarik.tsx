import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, REKENING_COLORS } from '../../src/lib/theme';
import { fmtRp } from '../../src/lib/utils';
import { usePromptModal } from '../../src/components/PromptModal';

export default function TarikScreen() {
  const { prompt, PromptComponent } = usePromptModal();
  const [rekening, setRekening] = useState<any[]>([]);
  const [fees, setFees] = useState<number[]>([3000, 5000, 10000]);
  const [selectedFee, setSelectedFee] = useState<number | null>(null);
  const [nominal, setNominal] = useState('');
  const [selectedRek, setSelectedRek] = useState<any>(null);
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
    return () => { setShowForm(false); setSelectedFee(null); };
  }, []));

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: rek }, { data: peng }] = await Promise.all([
      supabase.from('rekening').select('*').eq('user_id', user.id).order('urutan'),
      supabase.from('pengaturan').select('fees_tu').eq('user_id', user.id).single(),
    ]);
    setRekening(rek || []);
    if (peng?.fees_tu) setFees(peng.fees_tu);
  };

  const selectFee = (fee: number) => {
    setSelectedFee(fee);
    setShowForm(true);
  };

  const addCustomFee = () => {
    prompt('Biaya Admin Custom (Rp)', (val) => {
      if (val && !isNaN(Number(val)) && Number(val) > 0) selectFee(Number(val));
    });
  };

  const simpan = async () => {
    if (!nominal || Number(nominal) <= 0) return Alert.alert('Error', 'Masukkan nominal yang valid');
    if (!selectedRek) return Alert.alert('Error', 'Pilih rekening sumber');
    if (!selectedFee) return Alert.alert('Error', 'Pilih biaya admin');
    if (selectedRek.saldo < Number(nominal)) return Alert.alert('Saldo Tidak Cukup', `Saldo ${selectedRek.nama} hanya ${fmtRp(selectedRek.saldo)}`);

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const newSaldo = selectedRek.saldo - Number(nominal);
      await supabase.from('rekening').update({ saldo: newSaldo, updated_at: new Date().toISOString() }).eq('id', selectedRek.id);

      const { data: peng } = await supabase.from('pengaturan').select('total_keuntungan').eq('user_id', user!.id).single();
      const newKtg = (peng?.total_keuntungan || 0) + selectedFee;
      await supabase.from('pengaturan').update({ total_keuntungan: newKtg }).eq('user_id', user!.id);

      await supabase.from('transaksi').insert({
        user_id: user!.id, jenis: 'TU', nominal: Number(nominal),
        admin: selectedFee, rekening_id: selectedRek.id,
        rekening_nama: selectedRek.nama, catatan,
        tanggal: new Date().toISOString(),
      });

      Alert.alert('✅ Berhasil', `Tarik Tunai ${fmtRp(Number(nominal))} berhasil disimpan!`);
      setNominal(''); setCatatan(''); setSelectedRek(null); setSelectedFee(null); setShowForm(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💸 Tarik Tunai</Text>
        <Text style={styles.headerSub}>Pilih biaya admin untuk mulai</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Fee Buttons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PILIH BIAYA ADMIN</Text>
          <View style={styles.feesWrap}>
            {fees.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.feeBtn, selectedFee === f && styles.feeBtnActive]}
                onPress={() => selectFee(f)}
              >
                <Text style={[styles.feeBtnText, selectedFee === f && styles.feeBtnTextActive]}>{fmtRp(f)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.feeBtn, styles.feeBtnCustom]} onPress={addCustomFee}>
              <Text style={styles.feeBtnText}>+ Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        {showForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 FORM TARIK TUNAI</Text>

            <Text style={styles.label}>Nominal Penarikan</Text>
            <TextInput
              style={styles.input} placeholder="Contoh: 200000"
              placeholderTextColor={colors.gray400}
              value={nominal} onChangeText={setNominal} keyboardType="numeric"
            />

            <Text style={styles.label}>Sumber Cash (Rekening)</Text>
            <View style={styles.rekeningList}>
              {rekening.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.rekeningOpt, selectedRek?.id === r.id && styles.rekeningOptActive]}
                  onPress={() => setSelectedRek(r)}
                >
                  <View style={[styles.rekeningIcon, { backgroundColor: REKENING_COLORS[r.warna] || '#dbeafe' }]}>
                    <Text>{r.emoji || '💳'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rekeningName}>{r.nama}</Text>
                    <Text style={styles.rekeningBalance}>{fmtRp(r.saldo)}</Text>
                  </View>
                  {selectedRek?.id === r.id && <Text style={{ color: colors.blue }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Biaya Admin</Text>
            <View style={[styles.input, { justifyContent: 'center' }]}>
              <Text style={{ color: colors.gray800, fontSize: 15 }}>{fmtRp(selectedFee || 0)}</Text>
            </View>

            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              style={styles.input} placeholder="Contoh: Nasabah BCA"
              placeholderTextColor={colors.gray400}
              value={catatan} onChangeText={setCatatan}
            />

            {/* Preview */}
            {nominal ? (
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Uang Cash Berkurang</Text>
                <Text style={[styles.previewValue, { color: colors.red }]}>{fmtRp(Number(nominal))}</Text>
                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.previewLabel}>Keuntungan Admin</Text>
                  <Text style={[styles.previewValue, { color: colors.green, fontSize: 14 }]}>{fmtRp(selectedFee || 0)}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setShowForm(false); setSelectedFee(null); }}>
                <Text style={styles.btnOutlineText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger, loading && { opacity: 0.7 }]} onPress={simpan} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>💸 Simpan TU</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      <PromptComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { backgroundColor: colors.blueDark, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 12 },
  feesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.white },
  feeBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  feeBtnCustom: { borderStyle: 'dashed' },
  feeBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  feeBtnTextActive: { color: colors.white },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 8, padding: 12, fontSize: 15, color: colors.gray800, marginBottom: 12 },
  rekeningList: { marginBottom: 12, gap: 8 },
  rekeningOpt: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.gray200, gap: 10 },
  rekeningOptActive: { borderColor: colors.blue, backgroundColor: '#eff6ff' },
  rekeningIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rekeningName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  rekeningBalance: { fontSize: 12, color: colors.gray500 },
  preview: { backgroundColor: colors.gray50, borderRadius: 8, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: colors.gray200 },
  previewLabel: { fontSize: 12, color: colors.gray500 },
  previewValue: { fontSize: 18, fontWeight: '700', marginTop: 2, marginBottom: 4 },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 8 },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnOutline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.gray200 },
  btnDanger: { backgroundColor: colors.red },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.white },
});
