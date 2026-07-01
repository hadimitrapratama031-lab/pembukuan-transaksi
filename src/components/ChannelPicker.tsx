import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

const QUICK_OPTIONS = ['DANA', 'GoPay', 'OVO', 'ShopeePay', 'BCA', 'BRI', 'BNI', 'Mandiri', 'SeaBank'];

/**
 * Picker "info tambahan" — dipakai untuk mencatat channel yang dipakai CUSTOMER,
 * TERPISAH dari rekening yang benar-benar mempengaruhi saldo.
 * Contoh: TU → customer kirim dari mana. TF → customer minta kirim ke mana.
 * Field ini opsional dan tidak pernah mempengaruhi perhitungan saldo.
 */
export function ChannelPicker({
  label, helper, value, onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors: themeColors } = useTheme();
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const isQuick = !value || QUICK_OPTIONS.includes(value);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.infoDot}>
          <Ionicons name="information" size={11} color={colors.gray100} />
        </View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.optionalTag}>opsional</Text>
      </View>
      <Text style={styles.helper}>{helper}</Text>

      <View style={styles.chipsWrap}>
        {QUICK_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => { onChange(value === opt ? '' : opt); setCustomMode(false); }}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, styles.chipCustom, !isQuick && styles.chipActive]}
          onPress={() => { setCustomMode(true); setCustomVal(isQuick ? '' : value); }}
        >
          <Text style={[styles.chipText, !isQuick && styles.chipTextActive]}>
            {!isQuick ? value : '+ Lainnya'}
          </Text>
        </TouchableOpacity>
      </View>

      {customMode && (
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder="Ketik nama bank/e-wallet lain..."
            placeholderTextColor={colors.gray400}
            value={customVal}
            onChangeText={setCustomVal}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.customOkBtn, { backgroundColor: themeColors.blue }]}
            onPress={() => { onChange(customVal.trim()); setCustomMode(false); }}
          >
            <Ionicons name="checkmark" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  infoDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gray400, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  optionalTag: { fontSize: 10, fontWeight: '600', color: colors.gray400, backgroundColor: colors.gray50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 2 },
  helper: { fontSize: 11.5, color: colors.gray500, marginBottom: 8, lineHeight: 16 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.surface1 },
  chipActive: { backgroundColor: colors.gray400, borderColor: colors.gray400 },
  chipCustom: { borderStyle: 'dashed' },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.gray600 },
  chipTextActive: { color: colors.gray100 },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  customInput: { flex: 1, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 10, padding: 10, fontSize: 14, color: colors.gray800, backgroundColor: colors.surface1 },
  customOkBtn: { width: 40, borderRadius: 10, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
});
