// theme.ts — palet warna aplikasi (mendukung beberapa pilihan tema warna).
// Bagian netral (abu-abu, permukaan gelap, dst) sama di semua tema.
// Yang berubah per-tema hanya warna aksen (hijau/biru/ungu/dll).

export type ThemeKey = 'hijau' | 'biru' | 'ungu' | 'oranye' | 'merah' | 'pink' | 'teal';

// ---------- Bagian netral: SAMA untuk semua tema ----------
const BASE = {
  red: '#f87171',
  redLight: '#3a1414',
  orange: '#fbbf24',
  orangeLight: '#3a2c12',

  // Skala netral — dasar gelap (dark theme)
  gray50: '#1b2320',
  gray100: '#0a0d0b',
  gray200: '#242b27',
  gray300: '#333c37',
  gray400: '#7c877f',
  gray500: '#9aa39c',
  gray600: '#b7bfb9',
  gray700: '#d6ddd7',
  gray800: '#f2f5f2',
  gray900: '#ffffff',
  white: '#ffffff',

  // Permukaan kartu (dark surfaces)
  surface1: '#161c18',
  surface2: '#1c2320',

  // Chip ikon layanan lain (tidak ikut berubah per tema)
  iconBlueBg: '#12233a', iconBlueFg: '#60a5fa',
  iconAmberBg: '#3a2c12', iconAmberFg: '#fbbf24',
  iconRedBg: '#3a1414', iconRedFg: '#f87171',
  iconPurpleBg: '#241c3a', iconPurpleFg: '#a78bfa',
};

// ---------- Bagian aksen: BEDA per tema ----------
type AccentPalette = {
  blue: string; blueLight: string; blueDark: string; blueDeep: string;
  accent: string; accentLight: string;
  green: string; greenLight: string;
  iconGreenBg: string; iconGreenFg: string;
  GRADIENT_HEADER: [string, string];
  GRADIENT_CARD: [string, string];
};

const ACCENTS: Record<ThemeKey, AccentPalette> = {
  hijau: {
    blue: '#16a34a', blueLight: '#22c55e', blueDark: '#0d1512', blueDeep: '#0a0d0b',
    accent: '#0f9d58', accentLight: '#34d399',
    green: '#22c55e', greenLight: '#123321',
    iconGreenBg: '#123321', iconGreenFg: '#34d399',
    GRADIENT_HEADER: ['#1a6c3c', '#0f9d58'],
    GRADIENT_CARD: ['#0f9d58', '#059669'],
  },
  biru: {
    blue: '#2563eb', blueLight: '#3b82f6', blueDark: '#0d131f', blueDeep: '#0a0d0b',
    accent: '#2563eb', accentLight: '#60a5fa',
    green: '#3b82f6', greenLight: '#12233a',
    iconGreenBg: '#12233a', iconGreenFg: '#60a5fa',
    GRADIENT_HEADER: ['#1e3a8a', '#2563eb'],
    GRADIENT_CARD: ['#2563eb', '#1d4ed8'],
  },
  ungu: {
    blue: '#7c3aed', blueLight: '#8b5cf6', blueDark: '#160d1f', blueDeep: '#0a0d0b',
    accent: '#7c3aed', accentLight: '#a78bfa',
    green: '#8b5cf6', greenLight: '#241c3a',
    iconGreenBg: '#241c3a', iconGreenFg: '#a78bfa',
    GRADIENT_HEADER: ['#4c1d95', '#7c3aed'],
    GRADIENT_CARD: ['#7c3aed', '#6d28d9'],
  },
  oranye: {
    blue: '#ea580c', blueLight: '#fb923c', blueDark: '#1f150d', blueDeep: '#0a0d0b',
    accent: '#ea580c', accentLight: '#fdba74',
    green: '#fb923c', greenLight: '#3a2c12',
    iconGreenBg: '#3a2c12', iconGreenFg: '#fbbf24',
    GRADIENT_HEADER: ['#9a3412', '#ea580c'],
    GRADIENT_CARD: ['#ea580c', '#c2410c'],
  },
  merah: {
    blue: '#dc2626', blueLight: '#ef4444', blueDark: '#1f0d0d', blueDeep: '#0a0d0b',
    accent: '#dc2626', accentLight: '#f87171',
    green: '#ef4444', greenLight: '#3a1414',
    iconGreenBg: '#3a1414', iconGreenFg: '#f87171',
    GRADIENT_HEADER: ['#7f1d1d', '#dc2626'],
    GRADIENT_CARD: ['#dc2626', '#b91c1c'],
  },
  pink: {
    blue: '#db2777', blueLight: '#ec4899', blueDark: '#1f0d17', blueDeep: '#0a0d0b',
    accent: '#db2777', accentLight: '#f472b6',
    green: '#ec4899', greenLight: '#3a1428',
    iconGreenBg: '#3a1428', iconGreenFg: '#f472b6',
    GRADIENT_HEADER: ['#831843', '#db2777'],
    GRADIENT_CARD: ['#db2777', '#be185d'],
  },
  teal: {
    blue: '#0d9488', blueLight: '#14b8a6', blueDark: '#0d1a19', blueDeep: '#0a0d0b',
    accent: '#0d9488', accentLight: '#2dd4bf',
    green: '#14b8a6', greenLight: '#0f2e2c',
    iconGreenBg: '#0f2e2c', iconGreenFg: '#2dd4bf',
    GRADIENT_HEADER: ['#115e59', '#0d9488'],
    GRADIENT_CARD: ['#0d9488', '#0f766e'],
  },
};

export const THEME_OPTIONS: { key: ThemeKey; label: string; swatch: string }[] = [
  { key: 'hijau', label: 'Hijau', swatch: ACCENTS.hijau.blueLight },
  { key: 'biru', label: 'Biru', swatch: ACCENTS.biru.blueLight },
  { key: 'ungu', label: 'Ungu', swatch: ACCENTS.ungu.blueLight },
  { key: 'oranye', label: 'Oranye', swatch: ACCENTS.oranye.blueLight },
  { key: 'merah', label: 'Merah', swatch: ACCENTS.merah.blueLight },
  { key: 'pink', label: 'Pink', swatch: ACCENTS.pink.blueLight },
  { key: 'teal', label: 'Teal', swatch: ACCENTS.teal.blueLight },
];

export function getColors(key: ThemeKey) {
  const accent = ACCENTS[key] || ACCENTS.hijau;
  return { ...BASE, ...accent };
}

export const DEFAULT_THEME: ThemeKey = 'hijau';

// Export statis (default hijau) — dipakai sebagai fallback sebelum ThemeProvider siap,
// dan oleh kode lama yang belum sempat memakai useTheme().
export const colors = getColors(DEFAULT_THEME);
export const GRADIENT_HEADER = ACCENTS[DEFAULT_THEME].GRADIENT_HEADER;
export const GRADIENT_CARD = ACCENTS[DEFAULT_THEME].GRADIENT_CARD;

export const REKENING_COLORS: Record<string, string> = {
  'bg-blue': '#12233a',
  'bg-green': '#123321',
  'bg-purple': '#241c3a',
  'bg-orange': '#3a2c12',
  'bg-pink': '#3a1428',
  'bg-teal': '#0f2e2c',
  'bg-red': '#3a1414',
  'bg-yellow': '#3a3512',
};
