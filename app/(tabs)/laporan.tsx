import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
// PENTING: expo-file-system v19 (Expo SDK 54) memindahkan writeAsStringAsync,
// EncodingType, dan cacheDirectory ke "expo-file-system/legacy". Import dari
// "expo-file-system" biasa membuat method2 itu undefined -> exportExcel gagal
// dengan error "Cannot read property 'base64' of undefined".
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx-js-style';
import { supabase } from '../../src/lib/supabase';
import { fmtRp, fmtDate, todayStr } from '../../src/lib/utils';
import { TxItem } from './dashboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/lib/ThemeContext';

type FilterType = 'hari' | 'minggu' | 'bulan';

export default function LaporanScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  // --- Styling helpers untuk border & header rapi ---
  const THIN = { style: 'thin', color: { rgb: '000000' } } as const;
  const BORDER_ALL = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  const STYLE_HEADER = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2F6FED' } },
    border: BORDER_ALL,
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
  };
  const STYLE_CELL = { border: BORDER_ALL, alignment: { vertical: 'center' } };
  const STYLE_TOTAL = { font: { bold: true }, border: BORDER_ALL, fill: { fgColor: { rgb: 'EFEFEF' } } };

  // Kasih border+style ke seluruh baris berisi data. Baris kosong (pemisah) dilewati.
  const styleSheet = (ws: any, totalRowIdx?: number) => {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) continue;
        if (r === 0) ws[addr].s = STYLE_HEADER;
        else if (totalRowIdx !== undefined && r === totalRowIdx) ws[addr].s = STYLE_TOTAL;
        else ws[addr].s = STYLE_CELL;
      }
    }
  };

  const exportExcel = async () => {
    if (tx.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // --- Sheet 1: Transaksi ---
      // "Bertambah/Berkurang" langsung kelihatan tanpa itung saldo sebelum/sesudah.
      // "Keterangan" nampilin kalau ada penyesuaian channel — misalnya customer minta
      // GoPay tapi rekening modal GoPay gaada, jadi dipakai SeaBank: tulisannya jadi
      // "SeaBank → GoPay (customer)" biar jelas rekening modal apa yang dipakai.
      const txData = [['No', 'Tanggal', 'Jenis', 'Nominal', 'Admin', 'Bertambah', 'Berkurang', 'Keterangan']];
      tx.forEach((t, i) => {
        const isTU = t.jenis === 'TU';
        const namaBertambah = isTU ? t.rekening_nama : t.cash_rekening_nama;
        const namaBerkurang = isTU ? t.cash_rekening_nama : t.rekening_nama;
        let keterangan = t.catatan || '-';
        if (t.channel_customer) {
          const info = isTU
            ? `Customer kirim dari ${t.channel_customer}`
            : `${t.rekening_nama || 'Rekening modal'} → ${t.channel_customer} (customer)`;
          keterangan = t.catatan ? `${info}. ${t.catatan}` : info;
        }
        txData.push([
          String(i + 1), fmtDate(t.tanggal), isTU ? 'Tarik Tunai' : 'Transfer',
          fmtRp(t.nominal), fmtRp(t.admin),
          `${namaBertambah || '-'} (+${fmtRp(t.nominal)})`,
          `${namaBerkurang || '-'} (-${fmtRp(t.nominal)})`,
          keterangan,
        ]);
      });
      const totalRow1 = txData.length;
      txData.push(['', 'TOTAL', '', fmtRp(tuTotal + tfTotal), fmtRp(totalAdmin), '', '', '']);
      const ws1 = XLSX.utils.aoa_to_sheet(txData);
      ws1['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 26 }, { wch: 34 }];
      styleSheet(ws1, totalRow1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi');

      // --- Sheet 2: Saldo Rekening ---
      const totalModal = rekening.reduce((s, r) => s + r.saldo, 0);
      const totalSaldoKeuntungan = totalModal + keuntungan;
      const totalSaldoAdmin = totalModal + totalAdmin;

      const rData = [['Rekening', 'Saldo']];
      rekening.forEach(r => rData.push([r.nama, fmtRp(r.saldo)]));
      const totalRow2 = rData.length;
      rData.push(['Total Saldo', fmtRp(totalModal)]);
      rData.push(['Total Admin (Periode Ini)', fmtRp(totalAdmin)]);
      rData.push(['TOTAL Saldo + Admin', fmtRp(totalSaldoAdmin)]);
      rData.push(['Total Keuntungan Kumulatif', fmtRp(keuntungan)]);
      rData.push(['TOTAL Saldo + Keuntungan', fmtRp(totalSaldoKeuntungan)]);
      const ws2 = XLSX.utils.aoa_to_sheet(rData);
      ws2['!cols'] = [{ wch: 28 }, { wch: 18 }];
      styleSheet(ws2, totalRow2);
      // Tebalin baris2 total lainnya juga (bukan cuma baris "Total Saldo")
      for (let r = totalRow2; r < rData.length; r++) {
        for (let c = 0; c < 2; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (ws2[addr]) ws2[addr].s = STYLE_TOTAL;
        }
      }
      XLSX.utils.book_append_sheet(wb, ws2, 'Saldo Rekening');

      // --- Sheet 3: Ringkasan ---
      const ringkasan = [
        ['LAPORAN KASIR ATM', ''],
        ['Periode', filter === 'hari' ? 'Hari Ini' : filter === 'minggu' ? 'Minggu Ini' : 'Bulan Ini'],
        ['Tanggal Export', fmtDate(new Date().toISOString())],
        ['Total Transaksi', String(tx.length)],
        ['Total Admin (Periode Ini)', fmtRp(totalAdmin)],
        ['Total Saldo Sekarang', fmtRp(totalModal)],
        ['TOTAL Saldo + Admin', fmtRp(totalSaldoAdmin)],
        ['Total Keuntungan Kumulatif', fmtRp(keuntungan)],
        ['TOTAL Saldo + Keuntungan', fmtRp(totalSaldoKeuntungan)],
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(ringkasan);
      ws3['!cols'] = [{ wch: 28 }, { wch: 18 }];
      styleSheet(ws3);
      // Tebalin baris2 total di ringkasan (baris "TOTAL Saldo + Admin" & "TOTAL Saldo + Keuntungan")
      ['A7', 'B7', 'A9', 'B9'].forEach(a => { if (ws3[a]) ws3[a].s = STYLE_TOTAL; });
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
      <LinearGradient colors={GRADIENT_HEADER} style={styles.header}>
        <Text style={styles.headerTitle}>📊 Laporan</Text>
      </LinearGradient>

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

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.surface1 },
  filterBtnActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  filterTextActive: { color: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 12, padding: 14, elevation: 2 },
  summaryLabel: { fontSize: 11, color: colors.gray500, fontWeight: '500' },
  summaryValue: { fontSize: 17, fontWeight: '700', color: colors.gray800, marginTop: 4 },
  exportBtn: { backgroundColor: colors.green, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  exportBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 8 },
  txCard: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 16, marginBottom: 8 },
});
}