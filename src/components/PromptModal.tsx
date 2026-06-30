import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

export function usePromptModal() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [onConfirm, setOnConfirm] = useState<((v: string) => void) | null>(null);

  const prompt = (promptTitle: string, callback: (v: string) => void) => {
    setTitle(promptTitle);
    setValue('');
    setOnConfirm(() => callback);
    setVisible(true);
  };

  const PromptComponent = () => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="Masukkan nominal"
            placeholderTextColor={colors.gray400}
            autoFocus
          />
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setVisible(false)}>
              <Text style={styles.btnOutlineText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => { setVisible(false); onConfirm?.(value); }}
            >
              <Text style={styles.btnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { prompt, PromptComponent };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: colors.white, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 },
  title: { fontSize: 16, fontWeight: '700', color: colors.gray800, marginBottom: 16 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16, color: colors.gray800 },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnOutline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.gray200 },
  btnPrimary: { backgroundColor: colors.blue },
  btnOutlineText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  btnText: { fontSize: 14, fontWeight: '600', color: colors.white },
});
