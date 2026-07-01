// Status "unlock" PIN disimpan di memory (BUKAN AsyncStorage) supaya:
// 1. Setiap app dibuka ulang dari kondisi tertutup (cold start), status selalu balik ke "terkunci"
//    karena variabel ini di-reset setiap kali JS engine reload.
// 2. Setiap app diminimize/background lalu dibuka lagi, juga otomatis terkunci lagi
//    (lihat listener AppState di app/_layout.tsx).
let unlocked = false;

// Beberapa aksi (mis. buka galeri lewat expo-image-picker) sempat membuat
// Android/iOS menganggap app "background" sesaat walau user sebenarnya masih
// di dalam alur yang sama (cuma buka picker bawaan sistem). Tanpa ini, listener
// AppState di app/_layout.tsx akan salah mengira user keluar app dan langsung
// mengunci ulang (lempar ke halaman PIN) begitu balik dari galeri.
let relockPaused = false;
let relockPauseTimer: ReturnType<typeof setTimeout> | null = null;

export function isUnlocked(): boolean {
  return unlocked;
}

export function setUnlocked(value: boolean) {
  unlocked = value;
}

export function isRelockPaused(): boolean {
  return relockPaused;
}

// Panggil sebelum membuka image picker / aksi sejenis yang membuka UI sistem.
// Otomatis lepas sendiri setelah `ms` jaga-jaga kalau lupa resume / picker macet.
export function pauseRelock(ms = 15000) {
  relockPaused = true;
  if (relockPauseTimer) clearTimeout(relockPauseTimer);
  relockPauseTimer = setTimeout(() => { relockPaused = false; }, ms);
}

export function resumeRelock() {
  relockPaused = false;
  if (relockPauseTimer) { clearTimeout(relockPauseTimer); relockPauseTimer = null; }
}
