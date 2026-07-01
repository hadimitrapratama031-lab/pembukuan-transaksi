import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, REKENING_COLORS } from '../lib/theme';
import { fmtRp } from '../lib/utils';
import { resolveBrandLogo } from '../lib/brandMap';

export type Rekening = {
  id: string; nama: string; emoji?: string; warna?: string; saldo: number; tipe?: string; logo_url?: string | null;
};

export function RekeningDropdown({
  label, placeholder, value, options, onSelect, accent = colors.blue,
}: {
  label: string;
  placeholder: string;
  value: Rekening | null;
  options: Rekening[];
  onSelect: (r: Rekening) => void;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);

  // Lapisan pengaman: kalau rekening yang lagi "value" ternyata sudah tidak ada lagi
  // di daftar options (misal baru dihapus dari Pengaturan), jangan tampilkan datanya
  // di tombol pemicu — anggap saja belum ada yang dipilih.
  const validValue = value && options.some(o => o.id === value.id) ? value : null;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {validValue ? (
          <View style={styles.triggerInner}>
            <View style={[styles.icon, { backgroundColor: REKENING_COLORS[validValue.warna || ''] || colors.iconBlueBg }]}>
              {resolveBrandLogo(validValue) ? (
                <Image source={{ uri: resolveBrandLogo(validValue)! }} style={styles.iconLogoImg} />
              ) : (
                <Text>{validValue.emoji || '💳'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{validValue.nama}</Text>
              <Text style={styles.balance}>{fmtRp(validValue.saldo)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.gray400} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.length === 0 ? (
              <Text style={styles.empty}>Belum ada rekening tersedia.</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(r) => r.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item: r }) => (
                  <TouchableOpacity
                    style={[styles.option, value?.id === r.id && { borderColor: accent, backgroundColor: 'rgba(22,163,74,0.14)' }]}
                    onPress={() => { onSelect(r); setOpen(false); }}
                  >
                    <View style={[styles.icon, { backgroundColor: REKENING_COLORS[r.warna || ''] || colors.iconBlueBg }]}>
                      {resolveBrandLogo(r) ? (
                        <Image source={{ uri: resolveBrandLogo(r)! }} style={styles.iconLogoImg} />
                      ) : (
                        <Text>{r.emoji || '💳'}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{r.nama}</Text>
                      <Text style={styles.balance}>{fmtRp(r.saldo)}</Text>
                    </View>
                    {value?.id === r.id && <Ionicons name="checkmark-circle" size={20} color={accent} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 12, padding: 12, backgroundColor: colors.surface1,
  },
  triggerInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  placeholder: { color: colors.gray400, fontSize: 14 },
  icon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconLogoImg: { width: 26, height: 26, borderRadius: 6 },
  name: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  balance: { fontSize: 12, color: colors.gray500 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface1, borderWidth: 0.5, borderColor: colors.gray200, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '70%' },
  handle: { width: 36, height: 4, backgroundColor: colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.gray800, marginBottom: 12 },
  empty: { textAlign: 'center', color: colors.gray400, paddingVertical: 24 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.gray200, marginBottom: 8,
  },
});
