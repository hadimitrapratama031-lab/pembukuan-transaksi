import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { REKENING_COLORS } from '../../src/lib/theme';
import { useTheme } from '../../src/lib/ThemeContext';
import { fmtRp, fmtDate, todayStr } from '../../src/lib/utils';
import { resolveBrandLogo } from '../../src/lib/brandMap';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi,';
  if (h < 15) return 'Selamat siang,';
  if (h < 19) return 'Selamat sore,';
  return 'Selamat malam,';
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DashboardScreen() {
  const { colors, GRADIENT_HEADER } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rekening, setRekening] = useState<any[]>([]);
  const [transaksi, setTransaksi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const [appName, setAppName] = useState('Kasir ATM');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [showRekModal, setShowRekModal] = useState(false);
  const [filter, setFilter] = useState<'semua' | 'TU' | 'TF'>('semua');

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: rek }, { data: tx }, { data: peng }, { data: prof }] = await Promise.all([
      supabase.from('rekening').select('*').eq('user_id', user.id).order('urutan'),
      supabase.from('transaksi').select('*').eq('user_id', user.id).order('tanggal', { ascending: false }).limit(60),
      supabase.from('pengaturan').select('*').eq('user_id', user.id).single(),
      supabase.from('profiles').select('nama').eq('id', user.id).single(),
    ]);

    setRekening(rek || []);
    setTransaksi(tx || []);
    setUserName(prof?.nama || 'Admin');
    setAppName(peng?.app_name || 'Kasir ATM');
    setAppLogo(peng?.app_logo || null);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = todayStr();
  const yesterday = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const totalSaldo = rekening.reduce((s, r) => s + (r.saldo || 0), 0);

  const txHariIni = transaksi.filter(t => t.tanggal?.slice(0, 10) === today);
  const txKemarin = transaksi.filter(t => t.tanggal?.slice(0, 10) === yesterday);

  const now = new Date();
  const feeBulanIni = transaksi
    .filter(t => {
      const d = new Date(t.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, t) => s + (t.admin || 0), 0);

  const feeHariIni = txHariIni.reduce((s, t) => s + (t.admin || 0), 0);
  const feeKemarin = txKemarin.reduce((s, t) => s + (t.admin || 0), 0);
  const feePct = feeKemarin > 0
    ? Math.round(((feeHariIni - feeKemarin) / feeKemarin) * 100)
    : (feeHariIni > 0 ? 100 : 0);
  const txDiff = txHariIni.length - txKemarin.length;

  const filteredTx = (filter === 'semua' ? transaksi : transaksi.filter(t => t.jenis === filter)).slice(0, 6);

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.gray100 }]}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENT_HEADER} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.greetLabel}>{greeting()}</Text>
            <Text style={styles.greetName} numberOfLines={1}>{appName}</Text>
          </View>
          <View style={styles.avatar}>
            {appLogo
              ? <Image source={{ uri: appLogo }} style={styles.avatarImg} />
              : <Text style={styles.avatarText}>{initials(appName)}</Text>}
          </View>
        </View>

        <TouchableOpacity style={styles.rekModalBtn} activeOpacity={0.8} onPress={() => setShowRekModal(true)}>
          <Ionicons name="wallet-outline" size={14} color="#fff" />
          <Text style={styles.rekModalBtnText}>Rekening Modal</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Saldo Aktif</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>{fmtRp(totalSaldo + feeBulanIni)}</Text>
            <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Hari ini</Text></View>
          </View>
          <Text style={styles.balanceSub}>
            Admin Terkumpul bulan ini: <Text style={{ fontWeight: '700', color: '#fff' }}>{fmtRp(feeBulanIni)}</Text>
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.blue]} tintColor={colors.blue} />}
      >
        <Text style={styles.sectionLabel}>Layanan</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={() => router.push('/tarik')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.iconGreenBg }]}>
              <Ionicons name="cash-outline" size={20} color={colors.iconGreenFg} />
            </View>
            <Text style={styles.actionLabel}>Tarik Tunai</Text>
            <Text style={styles.actionSub}>TU</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={() => router.push('/transfer')}>
            <View style={[styles.actionIcon, { backgroundColor: colors.iconBlueBg }]}>
              <Ionicons name="arrow-down-outline" size={20} color={colors.iconBlueFg} />
            </View>
            <Text style={styles.actionLabel}>Setor Tunai</Text>
            <Text style={styles.actionSub}>TF</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <Ionicons name="trending-up-outline" size={13} color={colors.blue} />
              <Text style={styles.statLabel}>Pemasukan</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.blue }]}>{fmtRp(feeHariIni)}</Text>
            <Text style={[styles.statChange, feePct >= 0 ? styles.pos : styles.neg]}>
              {feePct >= 0 ? '↑' : '↓'} {Math.abs(feePct)}% vs kemarin
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <Ionicons name="pulse-outline" size={13} color={colors.iconBlueFg} />
              <Text style={styles.statLabel}>Transaksi</Text>
            </View>
            <Text style={styles.statValue}>{txHariIni.length}</Text>
            <Text style={[styles.statChange, txDiff >= 0 ? styles.pos : styles.neg]}>
              {txDiff >= 0 ? '↑' : '↓'} {Math.abs(txDiff)} lebih {txDiff >= 0 ? 'banyak' : 'sedikit'}
            </Text>
          </View>
        </View>

        <View style={styles.pageTabs}>
          {(['semua', 'TU', 'TF'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.tab, filter === f && styles.tabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                {f === 'semua' ? 'Semua' : f === 'TU' ? 'Tarik' : 'Setor'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Transaksi terbaru</Text>
        {filteredTx.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada transaksi.</Text>
        ) : (
          <View style={{ marginBottom: 8 }}>
            {filteredTx.map(t => <TxItem key={t.id} tx={t} />)}
          </View>
        )}
        <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/riwayat')}>
          <Text style={styles.seeAllText}>Lihat Semua Transaksi</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.blue} />
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: Rekening Modal — daftar rekening beserta isi modal masing-masing */}
      <Modal visible={showRekModal} transparent animationType="fade" onRequestClose={() => setShowRekModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowRekModal(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Rekening Modal</Text>
              <TouchableOpacity onPress={() => setShowRekModal(false)}>
                <Ionicons name="close" size={22} color={colors.gray500} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>Total modal seluruh rekening: <Text style={{ color: colors.blue, fontWeight: '700' }}>{fmtRp(totalSaldo)}</Text></Text>

            {rekening.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada rekening. Tambah di Pengaturan.</Text>
            ) : (
              <FlatList
                data={rekening}
                keyExtractor={r => r.id}
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: r }) => (
                  <View style={styles.rekItem}>
                    <View style={styles.rekLeft}>
                      <View style={[styles.rekIcon, { backgroundColor: REKENING_COLORS[r.warna] || colors.iconBlueBg }]}>
                        {resolveBrandLogo(r) ? (
                          <Image source={{ uri: resolveBrandLogo(r)! }} style={styles.rekLogoImg} />
                        ) : (
                          <Text style={{ fontSize: 16 }}>{r.emoji || '💳'}</Text>
                        )}
                      </View>
                      <View>
                        <Text style={styles.rekName}>{r.nama}</Text>
                        <Text style={styles.rekType}>{r.tipe === 'cash' ? 'Uang Tunai' : r.tipe === 'bank' ? 'Bank' : 'Digital'}</Text>
                      </View>
                    </View>
                    <Text style={styles.rekAmount}>{fmtRp(r.saldo)}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function TxItem({ tx }: { tx: any }) {
  const { colors } = useTheme();
  const txStyles = useMemo(() => createTxStyles(colors), [colors]);
  const subInfo = tx.jenis === 'TU'
    ? `${tx.cash_rekening_nama || '-'} → ${tx.rekening_nama || '-'}`
    : `${tx.rekening_nama || '-'} → ${tx.cash_rekening_nama || '-'}`;
  const isTU = tx.jenis === 'TU';
  const channelInfo = tx.channel_customer
    ? (isTU ? `Customer via ${tx.channel_customer}` : `TF ke tujuan customer: ${tx.channel_customer}`)
    : null;
  return (
    <View style={txStyles.row}>
      <View style={[txStyles.icon, { backgroundColor: isTU ? colors.iconGreenBg : colors.iconBlueBg }]}>
        <Ionicons name={isTU ? 'cash-outline' : 'arrow-down-outline'} size={17} color={isTU ? colors.iconGreenFg : colors.iconBlueFg} />
      </View>
      <View style={txStyles.info}>
        <Text style={txStyles.main} numberOfLines={1}>
          {tx.catatan || (isTU ? 'Tarik Tunai' : 'Setor Tunai')}
        </Text>
        <Text style={txStyles.sub} numberOfLines={1}>{fmtDate(tx.tanggal)} · {subInfo}</Text>
        {channelInfo ? <Text style={txStyles.channel} numberOfLines={1}>ℹ️ {channelInfo}</Text> : null}
      </View>
      <View style={txStyles.amount}>
        <Text style={txStyles.fee}>+{fmtRp(tx.admin)}</Text>
        <Text style={txStyles.nominal}>Nominal: {fmtRp(tx.nominal)}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 56, paddingBottom: 26, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greetLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  greetName: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rekModalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12,
  },
  rekModalBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14, padding: 16,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 4 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  balanceAmount: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  todayBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  todayBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  balanceSub: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 10 },
  scroll: { flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.gray500, marginBottom: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 },
  actionBtn: {
    flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200,
    borderRadius: 14, paddingVertical: 16,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.gray800 },
  actionSub: { fontSize: 10, color: colors.gray400 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 14, padding: 14 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  statLabel: { fontSize: 11, color: colors.gray400 },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.gray800 },
  statChange: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  pos: { color: colors.green },
  neg: { color: colors.red },
  pageTabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: colors.gray200 },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { fontSize: 12, color: colors.gray500, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  emptyText: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingVertical: 20 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  seeAllText: { fontSize: 13, fontWeight: '700', color: colors.blue },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '75%' },
  handle: { width: 36, height: 4, backgroundColor: colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.gray800 },
  sheetSub: { fontSize: 12, color: colors.gray500, marginBottom: 14 },
  rekItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  rekLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rekIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rekLogoImg: { width: 27, height: 27, borderRadius: 7 },
  rekName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  rekType: { fontSize: 11, color: colors.gray500 },
  rekAmount: { fontSize: 15, fontWeight: '700', color: colors.gray800 },
  });
}

function createTxStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface1,
    borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  main: { fontSize: 13, fontWeight: '600', color: colors.gray800 },
  sub: { fontSize: 11, color: colors.gray400, marginTop: 2 },
  channel: { fontSize: 10.5, color: colors.gray500, marginTop: 2, fontStyle: 'italic' },
  amount: { alignItems: 'flex-end' },
  fee: { fontSize: 13, fontWeight: '700', color: colors.green },
  nominal: { fontSize: 10, color: colors.gray400, marginTop: 2 },
  });
}
