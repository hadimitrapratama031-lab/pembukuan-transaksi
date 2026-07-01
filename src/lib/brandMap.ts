// Mapping nama rekening populer Indonesia → logo + warna brand
// Pakai Google Favicon API (gratis, stabil, tidak perlu akun)

export interface BrandInfo {
  logoUrl: string;
  warna: string;
  emoji: string;
}

// Helper: buat URL logo dari domain via Google Favicon API
const logo = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const BRAND_MAP: Record<string, BrandInfo> = {
  // E-Wallet
  'dana':       { logoUrl: logo('dana.id'),           warna: 'bg-blue',   emoji: '💳' },
  'gopay':      { logoUrl: logo('gojek.com'),          warna: 'bg-green',  emoji: '💚' },
  'gojek':      { logoUrl: logo('gojek.com'),          warna: 'bg-green',  emoji: '💚' },
  'ovo':        { logoUrl: logo('ovo.id'),             warna: 'bg-purple', emoji: '💜' },
  'shopeepay':  { logoUrl: logo('shopee.co.id'),       warna: 'bg-orange', emoji: '🛍️' },
  'shopee':     { logoUrl: logo('shopee.co.id'),       warna: 'bg-orange', emoji: '🛍️' },
  'linkaja':    { logoUrl: logo('linkaja.id'),         warna: 'bg-red',    emoji: '🔴' },
  'isaku':      { logoUrl: logo('isaku.co.id'),        warna: 'bg-purple', emoji: '💳' },
  'doku':       { logoUrl: logo('doku.com'),           warna: 'bg-blue',   emoji: '💳' },
  'paypal':     { logoUrl: logo('paypal.com'),         warna: 'bg-blue',   emoji: '💳' },

  // Bank Digital
  'jenius':     { logoUrl: logo('jenius.com'),         warna: 'bg-blue',   emoji: '💙' },
  'jago':       { logoUrl: logo('jago.com'),           warna: 'bg-green',  emoji: '💚' },
  'seabank':    { logoUrl: logo('seabank.co.id'),      warna: 'bg-blue',   emoji: '🌊' },
  'blu':        { logoUrl: logo('blubybcadigital.id'), warna: 'bg-blue',   emoji: '💙' },
  'superbank':  { logoUrl: logo('superbank.id'),       warna: 'bg-purple', emoji: '💳' },
  'neobank':    { logoUrl: logo('neobank.id'),         warna: 'bg-green',  emoji: '💳' },

  // Bank Konvensional
  'bca':        { logoUrl: logo('bca.co.id'),          warna: 'bg-blue',   emoji: '🏦' },
  'bri':        { logoUrl: logo('bri.co.id'),          warna: 'bg-blue',   emoji: '🏦' },
  'bni':        { logoUrl: logo('bni.co.id'),          warna: 'bg-orange', emoji: '🏦' },
  'mandiri':    { logoUrl: logo('bankmandiri.co.id'),  warna: 'bg-blue',   emoji: '🏦' },
  'bsi':        { logoUrl: logo('bankbsi.co.id'),      warna: 'bg-green',  emoji: '🏦' },
  'cimb':       { logoUrl: logo('cimbniaga.co.id'),    warna: 'bg-red',    emoji: '🏦' },
  'danamon':    { logoUrl: logo('danamon.co.id'),      warna: 'bg-blue',   emoji: '🏦' },
  'permata':    { logoUrl: logo('permatabank.com'),    warna: 'bg-red',    emoji: '🏦' },
  'btn':        { logoUrl: logo('btn.co.id'),          warna: 'bg-orange', emoji: '🏦' },
  'ocbc':       { logoUrl: logo('ocbc.id'),            warna: 'bg-red',    emoji: '🏦' },
  'maybank':    { logoUrl: logo('maybank.co.id'),      warna: 'bg-orange', emoji: '🏦' },
  'panin':      { logoUrl: logo('panin.co.id'),        warna: 'bg-blue',   emoji: '🏦' },
  'bjb':        { logoUrl: logo('bankbjb.co.id'),      warna: 'bg-blue',   emoji: '🏦' },
};

/**
 * Cari brand yang cocok berdasarkan nama yang diketik user.
 * Return null kalau tidak ada yang cocok.
 */
export function detectBrand(nama: string): BrandInfo | null {
  const lower = nama.toLowerCase().trim();
  if (!lower) return null;
  for (const [keyword, info] of Object.entries(BRAND_MAP)) {
    if (lower.includes(keyword)) return info;
  }
  return null;
}

/**
 * Ambil logo yang akan ditampilkan untuk sebuah rekening tersimpan.
 * Prioritas: logo_url yang sudah tersimpan di database → deteksi ulang dari nama
 * (buat rekening lama yang dibuat sebelum fitur logo otomatis ada).
 */
export function resolveBrandLogo(rekening: { logo_url?: string | null; nama?: string | null }): string | null {
  if (rekening.logo_url) return rekening.logo_url;
  return detectBrand(rekening.nama || '')?.logoUrl || null;
}
