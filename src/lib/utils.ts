export const fmtRp = (n: number | null | undefined): string => {
  const num = Number(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
};

export const fmtDate = (ts: string): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const startOfDay = (d: Date): Date => {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
};
export const endOfDay = (d: Date): Date => {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
};
