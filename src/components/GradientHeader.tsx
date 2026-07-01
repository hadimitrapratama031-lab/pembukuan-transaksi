import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export function GradientHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { GRADIENT_HEADER } = useTheme();
  return (
    <LinearGradient colors={GRADIENT_HEADER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56, paddingBottom: 22, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 21, fontWeight: '800', color: colors.white, letterSpacing: 0.2 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 3 },
});
