// Mode tampilan untuk akun admin: 'staff' = tampilan transaksi biasa (Dashboard/Tarik/Transfer/dll),
// 'admin' = tampilan Panel Admin doang (tanpa tab transaksi).
// Disimpan di memory (BUKAN AsyncStorage) supaya tiap PIN diminta ulang (cold start / app
// kembali dari background), admin ditanya ulang mau masuk sebagai Staff atau Admin.
export type AppMode = 'staff' | 'admin' | null;

let mode: AppMode = null;

export function getMode(): AppMode {
  return mode;
}

export function setMode(value: AppMode) {
  mode = value;
}
