import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/lib/ThemeContext';
import { fmtRp } from '../../src/lib/utils';
import { usePromptModal } from '../../src/components/PromptModal';
import { RekeningDropdown } from '../../src/components/RekeningDropdown';
import { ChannelPicker } from '../../src/components/ChannelPicker';
import { savePengaturan } from '../../src/lib/safeSave';

export default function TransferScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { prompt, PromptComponent } = usePromptModal();
  const [rekening, setRekening] = useState<any[]>([]);
  const [fees, setFees] = useState<number[]>([3000, 5000, 10000]);
  const [selectedFee, setSelectedFee] = useState<number | null>(null);
  const [nominal, setNominal] = useState('');
  const [selectedRek, setSelectedRek] = useState<any>(null); // rekening sumber modal, berkurang
  const [selectedCashRek, setSelectedCashRek] = useState<any>(null); // penerima cash dari customer, bertambah
  const [channelCustomer, setChannelCustomer] = useState(''); // hanya catatan: customer mau transfer ke mana
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: rek }, { data: peng }] = await Promise.all([
      supabase.from('rekening').select('*').eq('user_id', user.id).order('urutan'),
      supabase.from('pengaturan').select('fees_tf').eq('user_id', user.id).single(),
    ]);
    const list = rek || [];
    setRekening(list);
    if (peng?.fees_tf) setFees(peng.fees_tf);

    setSelectedRek((cur: any) => {
      if (!cur) return cur;
      const fresh = list.find(r => r.id === cur.id);
      return fresh || null;
    });
    setSelectedCashRek((cur: any) => {
      if (!cur) return cur;
      const fresh = list.find(r => r.id === cur.id);
      return fresh || null;
    });
  };

  const addCustomFee = () => {
    prompt('Biaya Admin Custom (Rp)', (val) => {
      if (val && !isNaN(Number(val)) && Number(val) > 0) setSelectedFee(Number(val));
    });
  };

  const resetForm = () => {
    setNominal(''); setCatatan(''); setChannelCustomer('');
    setSelectedRek(null); setSelectedCashRek(null); setSelectedFee(null);
  };

  const saldoKurang = !!(selectedRek && nominal && Number(nominal) > 0 && selectedRek.saldo < Number(nominal));
  const isValid = !!(nominal && Number(nominal) > 0 && selectedRek && selectedCashRek && selectedFee && selectedRek.id !== selectedCashRek.id);

  const simpan = async () => {
    if (!nominal || Number(nominal) <= 0) return Alert.alert('Error', 'Masukkan nominal yang valid');
    if (!selectedCashRek) return Alert.alert('Error', 'Pilih rekening penerima cash dari customer');
    if (!selectedRek) return Alert.alert('Error', 'Pilih rekening modal yang dipakai untuk kirim');
    if (selectedRek.id === selectedCashRek.id) return Alert.alert('Error', 'Rekening tidak boleh sama');
    if (!selectedFee) return Alert.alert('Error', 'Pilih biaya admin');
    if (selectedRek.saldo < Number(nominal)) {
      return Alert.alert(
        '⚠️ Modal Tidak Cukup',
        `Modal di rekening "${selectedRek.nama}" tidak cukup untuk transaksi ini.\n\nSaldo tersedia: ${fmtRp(selectedRek.saldo)}\nDibutuhkan: ${fmtRp(Number(nominal))}\nKurang: ${fmtRp(Number(nominal) - selectedRek.saldo)}`
      );
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return Alert.alert('Error', 'Sesi tidak ditemukan, silakan login ulang.'); }
    try {
      const nominalNum = Number(nominal);

      const { data: freshRek, error: errFresh } = await supabase
        .from('rekening').select('saldo, nama').eq('id', selectedRek.id).single();
      if (errFresh || !freshRek) throw new Error('Gagal memverifikasi saldo terbaru, coba lagi.');
      if (freshRek.saldo < nominalNum) {
        setLoading(false);
        return Alert.alert(
          '⚠️ Modal Tidak Cukup',
          `Modal di rekening "${freshRek.nama}" tidak cukup untuk transaksi ini.\n\nSaldo tersedia: ${fmtRp(freshRek.saldo)}\nDibutuhkan: ${fmtRp(nominalNum)}\nKurang: ${fmtRp(nominalNum - freshRek.saldo)}`
        );
      }

      const newSaldo = freshRek.saldo - nominalNum;
      const newCashSaldo = selectedCashRek.saldo + nominalNum;

      const { error: errRek } = await supabase.from('rekening')
        .update({ saldo: newSaldo, updated_at: new Date().toISOString() })
        .eq('id', selectedRek.id);
      if (errRek) throw new Error(`Gagal update saldo ${selectedRek.nama}: ${errRek.message}`);

      const { error: errCash } = await supabase.from('rekening')
        .update({ saldo: newCashSaldo, updated_at: new Date().toISOString() })
        .eq('id', selectedCashRek.id);
      if (errCash) {
        await supabase.from('rekening').update({ saldo: selectedRek.saldo }).eq('id', selectedRek.id);
        throw new Error(`Gagal update saldo ${selectedCashRek.nama}: ${errCash.message}`);
      }

      const { data: peng } = await supabase.from('pengaturan').select('total_keuntungan').eq('user_id', user.id).single();
      await savePengaturan(user.id, { total_keuntungan: (peng?.total_keuntungan || 0) + selectedFee });

      const { error: errTx } = await supabase.from('transaksi').insert({
        user_id: user.id, jenis: 'TF', nominal: nominalNum,
        admin: selectedFee, rekening_id: selectedRek.id,
        rekening_nama: selectedRek.nama,
        cash_rekening_id: selectedCashRek.id, cash_rekening_nama: selectedCashRek.nama,
        channel_customer: channelCustomer || null,
        catatan, tanggal: new Date().toISOString(),
      });
      if (errTx) throw new Error(`Saldo sudah diupdate tapi riwayat gagal disimpan: ${errTx.message}`);

      Alert.alert('✅ Berhasil', `Transfer ${fmtRp(nominalNum)} berhasil disimpan!`);
      resetForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENT_HEADER} style={styles.header}>
        <Text style={styles.headerTitle}>🔄 Transfer (TF)</Text>
        <Text style={styles.headerSub}>Kamu terima cash dari customer → kamu kirimkan lewat rekening kamu</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardTitle}>NOMINAL TRANSFER</Text>
          <View style={styles.nominalRow}>
            <Text style={styles.nominalPrefix}>Rp</Text>
            <TextInput
              style={styles.nominalInput} placeholder="0"
              placeholderTextColor={colors.gray400}
              value={nominal} onChangeText={setNominal} keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>BIAYA ADMIN (diambil dari customer)</Text>
          <View style={styles.feesWrap}>
            {fees.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.feeBtn, selectedFee === f && styles.feeBtnActive]}
                onPress={() => setSelectedFee(f)}
              >
                <Text style={[styles.feeBtnText, selectedFee === f && styles.feeBtnTextActive]}>{fmtRp(f)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.feeBtn, styles.feeBtnCustom]} onPress={addCustomFee}>
              <Text style={styles.feeBtnText}>+ Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.green }]}><Text style={styles.stepBadgeText}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Rekening kamu yang <Text style={{ color: colors.green }}>bertambah</Text></Text>
              <Text style={styles.stepHelper}>Tempat cash fisik dari customer kamu simpan/setorkan.</Text>
            </View>
          </View>
          <RekeningDropdown
            label=""
            placeholder="Pilih rekening/kas penerima cash"
            value={selectedCashRek}
            options={rekening}
            onSelect={setSelectedCashRek}
            accent={colors.green}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.red }]}><Text style={styles.stepBadgeText}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Rekening kamu yang <Text style={{ color: colors.red }}>berkurang</Text></Text>
              <Text style={styles.stepHelper}>Pilih rekening modal usaha yang benar-benar kamu pakai untuk kirim (mis. SeaBank).</Text>
            </View>
          </View>
          <RekeningDropdown
            label=""
            placeholder="Pilih rekening modal pengirim"
            value={selectedRek}
            options={rekening.filter(r => r.id !== selectedCashRek?.id)}
            onSelect={setSelectedRek}
            accent={colors.red}
          />
          {selectedRek && nominal && Number(nominal) > 0 && selectedRek.saldo < Number(nominal) ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>⚠️ Modal tidak cukup</Text>
              <Text style={styles.warnText}>
                Saldo "{selectedRek.nama}" hanya {fmtRp(selectedRek.saldo)}, dibutuhkan {fmtRp(Number(nominal))}.
              </Text>
            </View>
          ) : null}

          <ChannelPicker
            label={selectedRek ? `${selectedRek.nama} ini kamu TF ke tujuan customer apa?` : 'Rekening di atas kamu TF ke tujuan customer apa?'}
            helper='Cuma catatan, TIDAK ngaruh ke saldo — saldo yang kepotong tetap rekening yang kamu pilih di atas. Contoh: customer minta kirim ke GOPAY, kamu pilih SeaBank di atas → berarti SeaBank yang TF ke GOPAY.'
            value={channelCustomer}
            onChange={setChannelCustomer}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>CATATAN (OPSIONAL)</Text>
          <TextInput
            style={styles.input} placeholder="Contoh: Bu Sari transfer ke GOPAY anaknya"
            placeholderTextColor={colors.gray400}
            value={catatan} onChangeText={setCatatan}
          />
        </View>

        {nominal ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>RINGKASAN</Text>
            <View style={styles.previewLine}>
              <Text style={styles.previewLabel}>⬆️ {selectedCashRek?.nama || 'Rekening penerima cash'} bertambah</Text>
              <Text style={[styles.previewValue, { color: colors.green }]}>{fmtRp(Number(nominal))}</Text>
            </View>
            <View style={styles.previewLine}>
              <Text style={styles.previewLabel}>⬇️ {selectedRek?.nama || 'Rekening modal pengirim'} berkurang</Text>
              <Text style={[styles.previewValue, { color: colors.red }]}>{fmtRp(Number(nominal))}</Text>
            </View>
            {channelCustomer ? (
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>ℹ️ {selectedRek?.nama || 'Rekening berkurang'} → TF ke</Text>
                <Text style={[styles.previewValue, { color: colors.gray500, fontSize: 13 }]}>{channelCustomer}</Text>
              </View>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.previewLine}>
              <Text style={styles.previewLabel}>💰 Keuntungan Admin</Text>
              <Text style={[styles.previewValue, { color: colors.green }]}>{fmtRp(selectedFee || 0)}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, (loading || saldoKurang || !isValid) && { opacity: 0.5 }]}
          onPress={simpan}
          disabled={loading || saldoKurang || !isValid}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={styles.submitBtnText}>Simpan Transfer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      <PromptComponent />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  card: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 12 },
  nominalRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 14 },
  nominalPrefix: { fontSize: 20, fontWeight: '700', color: colors.gray500, marginRight: 6 },
  nominalInput: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.gray800, paddingVertical: 12 },
  feesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.surface1 },
  feeBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  feeBtnCustom: { borderStyle: 'dashed' },
  feeBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  feeBtnTextActive: { color: colors.white },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.gray800, marginBottom: 2 },
  stepHelper: { fontSize: 12, color: colors.gray500, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12, padding: 12, fontSize: 15, color: colors.gray800 },
  preview: { backgroundColor: colors.surface1, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: colors.gray200 },
  previewTitle: { fontSize: 11, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 10 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  warnBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.red },
  warnTitle: { fontSize: 13, fontWeight: '700', color: colors.red, marginBottom: 3 },
  warnText: { fontSize: 12, color: colors.gray700, lineHeight: 17 },
  previewLabel: { fontSize: 12.5, color: colors.gray500, flexShrink: 1, marginRight: 8 },
  previewValue: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 4, marginBottom: 10 },
  submitBtn: { flexDirection: 'row', gap: 8, backgroundColor: colors.blue, padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
}
