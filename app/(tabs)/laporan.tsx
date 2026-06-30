import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import { fmtRp, fmtDate, todayStr } from '../../src/lib/utils';
import { TxItem } from './dashboard';

type FilterType = 'hari' | 'minggu' | 'bulan';

export default function LaporanScreen() {
  const [filter, setFilter] = useState<FilterType>('hari');
  const [tx, setTx] = useState<any[]>([]);
  const [rekening, setRekening] = useState<any[]>([]);
  const [keuntungan, setKeuntungan] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, [filter]));

  const getRange = () => {
    const now = new Date();
    let dari = new Date();
    const sampai = new Date(); sampai.setHours(23, 59, 59, 999);
    if (filter === 'hari') dari.setHours(0, 0, 0, 0);
    else if (filter === 'minggu') { dari.setDate(dari.getDate() - dari.getDay()); dari.setHours(0, 0, 0, 0); }
    else { dari.setDate(1); dari.setHours(0, 0, 0, 0); }
    return { dari, sampai };
  };

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { dari, sampai } = getRange();

    const [{ data: txData }, { data: rekData }, { data: pengData }] = await Promise.all([
      supabase.from('transaksi').select('*').eq('user_id', user.id)
        .gte('tanggal', dari.toISOString()).lte('tanggal', sampai.toISOString())
        .order('tanggal', { ascending: false }),
      supabase.from('rekening').select('*').eq('user_id', user.id).order('urutan'),
      supabase.from('pengaturan').select('total_keuntungan').eq('user_id', user.id).single(),
    ]);

    setTx(txData || []);
    setRekening(rekData || []);
    setKeuntungan(pengData?.total_keuntungan || 0);
    setLoading(false);
  };

  const totalAdmin = tx.reduce((s, t) => s + t.admin, 0);
  const tuTotal = tx.filter(t => t.jenis === 'TU').reduce((s, t) => s + t.nominal, 0);
  const tfTotal = tx.filter(t => t.jenis === 'TF').reduce((s, t) => s + t.nominal, 0);

  const exportExcel = async () => {
    if (tx.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      const txData = [['No', 'Tanggal', 'Jenis', 'Nominal', 'Biaya Admin', 'Rekening', 'Rekening Cash', 'Catatan']];
      tx.forEach((t, i) => txData.push([
        String(i + 1), fmtDate(t.tanggal), t.jenis === 'TU' ? 'Tarik Tunai' : 'Transfer',
        String(t.nominal), String(t.admin), t.rekening_nama || '-', t.cash_rekening_nama || '-', t.catatan || '-'
      ]));
      txData.push([]);
      txData.push(['', 'TOTAL', '', String(tuTotal + tfTotal), String(totalAdmin), '', '', '']);
      const ws1 = XLSX.utils.aoa_to_sheet(txData);
      ws1['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi');

      const rData = [['Nama Rekening', 'Tipe', 'Saldo Saat Ini']];
      rekening.forEach(r => rData.push([r.nama, r.tipe === 'cash' ? 'Uang Tunai' : r.tipe === 'bank' ? 'Bank' : 'Digital', String(r.saldo)]));
      rData.push([]);
      rData.push(['TOTAL MODAL', '', String(rekening.reduce((s, r) => s + r.saldo, 0))]);
      rData.push(['TOTAL KEUNTUNGAN', '', String(keuntungan)]);
      const ws2 = XLSX.utils.aoa_to_sheet(rData);
      ws2['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Saldo Rekening');

      const ringkasan = [
        ['LAPORAN KASIR ATM'],
        ['Periode', filter === 'hari' ? 'Hari Ini' : filter === 'minggu' ? 'Minggu Ini' : 'Bulan Ini'],
        ['Tanggal Export', fmtDate(new Date().toISOString())],
        [],
        ['Total Transaksi', String(tx.length)],
        ['Total Tarik Tunai', String(tuTotal)],
        ['Total Transfer', String(tfTotal)],
        ['Total Keuntungan (Admin)', String(totalAdmin)],
        [],
        ['Total Modal Saat Ini', String(rekening.reduce((s, r) => s + r.saldo, 0))],
        ['Kumulatif Keuntungan', String(keuntungan)],
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(ringkasan);
      ws3['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Ringkasan');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `Kasir_ATM_${todayStr()}.xlsx`;
      const uri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Simpan Laporan Excel',
          UTI: 'com.microsoft.excel.xlsx',
        });
      }
    } catch (e: any) {
      alert('Gagal export: ' + e.message);
    }
    setExporting(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Laporan</Text>
      </View>

      <View style={styles.filterRow}>
        {([['hari', 'Hari Ini'], ['minggu', 'Minggu Ini'], ['bulan', 'Bulan Ini']] as [FilterType, string][]).map(([f, label]) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>
      ) : (
        <FlatList
          data={tx}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Transaksi</Text>
                  <Text style={[styles.summaryValue, { color: colors.blue }]}>{tx.length}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Keuntungan</Text>
                  <Text style={[styles.summaryValue, { color: colors.green }]}>{fmtRp(totalAdmin)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Nominal TU</Text>
                  <Text style={styles.summaryValue}>{fmtRp(tuTotal)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Nominal TF</Text>
                  <Text style={styles.summaryValue}>{fmtRp(tfTotal)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
                onPress={exportExcel}
                disabled={exporting}
              >
                {exporting
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.exportBtnText}>📊 Export ke Excel</Text>
                }
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>RINCIAN TRANSAKSI</Text>
            </>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
              <Text style={{ color: colors.gray400 }}>Tidak ada transaksi pada periode ini.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.txCard}><TxItem tx={item} /></View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { backgroundColor: colors.blueDark, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.white },
  filterBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  filterTextActive: { color: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: 12, padding: 14, elevation: 2 },
  summaryLabel: { fontSize: 11, color: colors.gray500, fontWeight: '500' },
  summaryValue: { fontSize: 17, fontWeight: '700', color: colors.gray800, marginTop: 4 },
  exportBtn: { backgroundColor: colors.green, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  exportBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 8 },
  txCard: { backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 16, marginBottom: 8 },
});
