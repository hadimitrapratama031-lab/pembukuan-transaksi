import * as Crypto from 'expo-crypto';

// Hash PIN dengan SHA-256 (di-salt pakai user id) sebelum disimpan ke Supabase.
// Tidak disimpan plain-text di database.
export async function hashPin(pin: string, userId: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${userId}:${pin}:kasir-atm-salt`
  );
}

export async function verifyPin(pin: string, userId: string, storedHash: string): Promise<boolean> {
  const h = await hashPin(pin, userId);
  return h === storedHash;
}
