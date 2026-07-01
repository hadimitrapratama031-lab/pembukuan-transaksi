import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export function PinDots({ length, filled }: { length: number; filled: number }) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  );
}

export function PinKeypad({ onPress, onDelete }: { onPress: (digit: string) => void; onDelete: () => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={styles.pad}>
      {keys.map((k, i) =>
        k === '' ? (
          <View key={i} style={styles.key} />
        ) : k === 'del' ? (
          <TouchableOpacity key={i} style={styles.key} onPress={onDelete}>
            <Ionicons name="backspace-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity key={i} style={styles.key} onPress={() => onPress(k)} activeOpacity={0.6}>
            <Text style={styles.keyText}>{k}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    dotsRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginVertical: 28 },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
    dotFilled: { backgroundColor: colors.accentLight, borderColor: colors.accentLight },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, alignSelf: 'center', justifyContent: 'center' },
    key: { width: 80, height: 64, alignItems: 'center', justifyContent: 'center' },
    keyText: { fontSize: 26, fontWeight: '700', color: colors.white },
  });
}

const styles = createStyles(colors);
