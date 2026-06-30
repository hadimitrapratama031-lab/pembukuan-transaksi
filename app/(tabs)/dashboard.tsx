import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, REKENING_COLORS } from '../../src/lib/theme';
import { fmtRp, fmtDate, todayStr } from '../../src/lib/utils';

export default function DashboardScreen() {
  const [rekening, setRekening] = useState<any[]>([]);
  const [transaksi, setTransaksi] = useState<any[]>([]);
  const [keuntungan, setKeuntungan] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: rek }, { data: tx }, { data: peng }, { data: prof }] = await Promise.all([
      supabase.from('rekening').select('*').eq('user_id', user.id).order('urutan'),
      supabase.from('transaksi').select('*').eq('user_id', user.id).order('tanggal', { ascending: false }).limit(5),
      supabase.from('pengaturan').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('nama').eq('id', user.id).single(),
    ]);

    setRekening(rek || []);
    setTransaksi(tx || []);
    setKeuntungan(peng?.total_keuntungan || 0);
    setUserName(prof?.nama || 'Admin');
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalModal = rekening.reduce((s, r) => s + (r.saldo || 0), 0);
  const today = todayStr();
  const txHari = transaksi.filter(t => t.tanggal?.slice(0, 10) === today).length;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💰 Kasir ATM</Text>
          <Text style={styles.headerSub}>Halo, {userName}! 👋</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.fullCard]}>
            <Text style={styles.summaryIcon}>💼</Text>
            <Text style={styles.summaryLabel}>Total Modal</Text>
            <Text style={[styles.summaryValue, { color: colors.blue }]}>{fmtRp(totalModal)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>💵</Text>
            <Text style={styles.summaryLabel}>Keuntungan</Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>{fmtRp(keuntungan)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>📝</Text>
            <Text style={styles.summaryLabel}>Tx Hari Ini</Text>
            <Text style={[styles.summaryValue, { color: colors.orange }]}>{txHari}</Text>
          </View>
        </View>

        {/* Rekening */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>REKENING MODAL</Text>
          {rekening.length === 0
            ? <Text style={styles.emptyText}>Belum ada rekening. Tambah di Pengaturan.</Text>
            : rekening.map(r => (
              <View key={r.id} style={styles.rekItem}>
                <View style={styles.rekLeft}>
                  <View style={[styles.rekIcon, { backgroundColor: REKENING_COLORS[r.warna] || '#dbeafe' }]}>
                    <Text style={{ fontSize: 16 }}>{r.emoji || '💳'}</Text>
                  </View>
                  <View>
                    <Text style={styles.rekName}>{r.nama}</Text>
                    <Text style={styles.rekType}>{r.tipe === 'cash' ? 'Uang Tunai' : r.tipe === 'bank' ? 'Bank' : 'Digital'}</Text>
                  </View>
                </View>
                <Text style={styles.rekAmount}>{fmtRp(r.saldo)}</Text>
              </View>
            ))
          }
        </View>

        {/* Recent Transaksi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TRANSAKSI TERAKHIR</Text>
          {transaksi.length === 0
            ? <Text style={styles.emptyText}>Belum ada transaksi.</Text>
            : transaksi.map(t => <TxItem key={t.id} tx={t} />)
          }
        </View>
      </ScrollView>
    </View>
  );
}

export function TxItem({ tx }: { tx: any }) {
  return (
    <View style={txStyles.row}>
      <View style={[txStyles.badge, tx.jenis === 'TU' ? txStyles.badgeTU : txStyles.badgeTF]}>
        <Text style={[txStyles.badgeText, tx.jenis === 'TU' ? txStyles.badgeTUText : txStyles.badgeTFText]}>
          {tx.jenis}
        </Text>
      </View>
      <View style={txStyles.info}>
        <Text style={txStyles.main} numberOfLines={1}>
          {tx.catatan || (tx.jenis === 'TU' ? 'Tarik Tunai' : 'Transfer')}
        </Text>
        <Text style={txStyles.sub}>{fmtDate(tx.tanggal)} · {tx.rekening_nama}</Text>
      </View>
      <View style={txStyles.amount}>
        <Text style={txStyles.nominal}>{fmtRp(tx.nominal)}</Text>
        <Text style={txStyles.admin}>+{fmtRp(tx.admin)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: colors.blueDark,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  scroll: { flex: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.white,
    borderRadius: 12, padding: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  fullCard: { minWidth: '100%', flexBasis: '100%' },
  summaryIcon: { fontSize: 20, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: colors.gray500, fontWeight: '500' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.gray800, marginTop: 2 },
  card: {
    backgroundColor: colors.white, borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: colors.gray500, letterSpacing: 0.5, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.gray400, textAlign: 'center', paddingVertical: 16 },
  rekItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rekLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rekIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rekName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  rekType: { fontSize: 11, color: colors.gray500 },
  rekAmount: { fontSize: 15, fontWeight: '700', color: colors.gray800 },
});

const txStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTU: { backgroundColor: colors.redLight },
  badgeTF: { backgroundColor: '#eff6ff' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTUText: { color: colors.red },
  badgeTFText: { color: colors.blue },
  info: { flex: 1 },
  main: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  sub: { fontSize: 11, color: colors.gray500, marginTop: 2 },
  amount: { alignItems: 'flex-end' },
  nominal: { fontSize: 14, fontWeight: '700', color: colors.gray800 },
  admin: { fontSize: 11, color: colors.green, fontWeight: '600' },
});
