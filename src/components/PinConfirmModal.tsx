import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { verifyPin } from '../lib/pin';
import { PinDots, PinKeypad } from './PinPad';

const PIN_LEN = 6;

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  userId: string;
  pinHash: string;
  onCancel: () => void;
  onConfirmed: () => void;
};

// Modal minta user memasukkan ulang PIN sebelum menjalankan aksi berbahaya
// (reset modal, hapus semua transaksi, hapus semua rekening, dll), supaya
// tidak ada aksi yang langsung jalan hanya karena tombolnya kepencet.
export default function PinConfirmModal({
  visible, title = 'Konfirmasi PIN', subtitle = 'Masukkan PIN untuk melanjutkan',
  userId, pinHash, onCancel, onConfirmed,
}: Props) {
  const { GRADIENT_HEADER } = useTheme();
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) setPin('');
  }, [visible]);

  useEffect(() => {
    if (pin.length === PIN_LEN && !checking) doVerify();
  }, [pin]);

  const doVerify = async () => {
    setChecking(true);
    const ok = await verifyPin(pin, userId, pinHash);
    setChecking(false);
    if (ok) {
      setPin('');
      onConfirmed();
    } else {
      Alert.alert('PIN Salah', 'PIN yang kamu masukkan salah, coba lagi.');
      setPin('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <LinearGradient colors={GRADIENT_HEADER} style={styles.box}>
          <Text style={styles.lock}>🔒</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
          <PinDots length={PIN_LEN} filled={pin.length} />
          {checking && <ActivityIndicator color={colors.white} style={{ marginBottom: 8 }} />}
          <PinKeypad
            onPress={(d) => { if (pin.length < PIN_LEN) setPin(pin + d); }}
            onDelete={() => setPin(pin.slice(0, -1))}
          />
          <Text style={styles.cancel} onPress={onCancel}>Batal</Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center' },
  box: { width: '92%', borderRadius: 24, paddingTop: 28, paddingBottom: 16, alignItems: 'center' },
  lock: { fontSize: 32 },
  title: { fontSize: 18, fontWeight: '700', color: colors.white, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  cancel: { textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4, fontWeight: '600' },
});
