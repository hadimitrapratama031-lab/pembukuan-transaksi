import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import { TxItem } from './dashboard';

export default function RiwayatScreen() {
  const [tx, setTx] = useState<any[]>([]);
  const [filter, setFilter] = useState<'semua' | 'TU' | 'TF'>('semua');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('transaksi')
      .select('*').eq('user_id', user.id)
      .order('tanggal', { ascending: false }).limit(200);
    setTx(data || []);
    setLoading(false);
  };

  const filtered = filter === 'semua' ? tx : tx.filter(t => t.jenis === filter);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Riwayat Transaksi</Text>
      </View>

      <View style={styles.filterRow}>
        {(['semua', 'TU', 'TF'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'semua' ? 'Semua' : f === 'TU' ? 'Tarik Tunai' : 'Transfer'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
          <Text style={{ color: colors.gray400 }}>Tidak ada transaksi.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TxItem tx={item} />
            </View>
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
  card: { backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 16, marginBottom: 8 },
});
