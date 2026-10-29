const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const num = (v) => nf.format(Number(v) || 0);
export const ib = (v) => `IB ${num(v)}`;

export const ibShort = (v) => {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  const fmt = (x, d = 2) => x.toLocaleString('id-ID', { maximumFractionDigits: d });
  if (abs >= 1e12) return `IB ${fmt(n / 1e12)} T`;
  if (abs >= 1e9) return `IB ${fmt(n / 1e9)} M`;
  if (abs >= 1e6) return `IB ${fmt(n / 1e6)} Jt`;
  return `IB ${num(n)}`;
};

export const signedPct = (v, digits = 2) => {
  const n = Number(v) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
};

export const changePct = (c) => {
  const ref = c.prev_close > 0 ? c.prev_close : c.base_price;
  if (!ref) return 0;
  return ((c.current_price - ref) / ref) * 100;
};

/** Mengurai timestamp SQLite ("YYYY-MM-DD HH:MM:SS" = UTC) maupun ISO. */
export const parseDate = (value) => {
  if (!value) return null;
  const s = String(value);
  const d = new Date(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`);
  return isNaN(d.getTime()) ? null : d;
};

export const dateTime = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
};

export const timeOnly = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
};

/** Sisa waktu menuju tanggal tertentu: "2h 4j", "35m", "Berakhir". */
export const timeLeft = (value) => {
  const d = parseDate(value);
  if (!d) return '-';
  let ms = d.getTime() - Date.now();
  if (ms <= 0) return 'Berakhir';
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const mins = Math.floor(ms / 60000);
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${mins}m`;
  return `${Math.max(1, mins)}m`;
};

/** Date → nilai <input type="datetime-local"> */
export const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const shortId = (id) => (id ? String(id).slice(0, 8) : '');
