import { useState, useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import { Ban, Clock, Search, X, CheckCircle2 } from 'lucide-react';
import { toLocalInput } from '../../lib/format';

export default function SuspendStockModal({ open, onClose, companies, onConfirm }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reason, setReason] = useState(
    'Penghentian sementara perdagangan (Cooling Down) untuk memberikan waktu memadai bagi pelaku pasar mempertimbangkan keputusan investasinya.'
  );

  // Default: 24 jam ke depan
  const [untilDate, setUntilDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return toLocalInput(d);
  });

  const [submitting, setSubmitting] = useState(false);

  // Filter emiten yang belum disuspensi
  const availableCompanies = useMemo(() => {
    return (companies || []).filter((c) => !c.is_suspended && c.status !== 'SUSPENDED');
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return availableCompanies.slice(0, 10);
    const q = searchQuery.toLowerCase().trim();
    return availableCompanies.filter((c) => {
      return (
        (c.symbol && c.symbol.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.sector && c.sector.toLowerCase().includes(q))
      );
    }).slice(0, 15);
  }, [availableCompanies, searchQuery]);

  const selectedCompany = useMemo(() => {
    return (companies || []).find((c) => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  const applyPresetHours = (hours) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    setUntilDate(toLocalInput(d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !untilDate) return;

    setSubmitting(true);
    const untilIso = new Date(untilDate).toISOString();
    await onConfirm(selectedCompanyId, untilIso, reason);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suspensi Perdagangan Saham (Trading Halt)"
      subtitle="Bekukan seluruh transaksi saham emiten sampai tanggal yang ditentukan"
      icon={Ban}
      tone="var(--rose)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="rose"
            onClick={handleSubmit}
            disabled={submitting || !selectedCompanyId}
          >
            {submitting ? 'Membekukan...' : 'Eksekusi Suspensi Sekarang'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <p className="font-bold">Dampak: Perdagangan Saham DIHENTIKAN</p>
          <p className="text-slate-300 mt-1">
            Seluruh order antrian beli & jual untuk saham ini akan dibekukan di bursa. Pemain tidak dapat bertransaksi sampai masa suspensi berakhir atau dicabut secara manual oleh admin.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="label mb-0">Pilih Emiten yang Akan Dibekukan</label>
          <p className="text-[11px] text-slate-400">Cari berdasarkan kode saham atau nama perseroan (360+ Emiten Aktif)</p>

          {selectedCompany ? (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-black text-rose-300 bg-rose-500/20 px-2 py-1 rounded border border-rose-500/30">
                  {selectedCompany.symbol}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-100">{selectedCompany.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Sektor: {selectedCompany.sector} • Harga: IB {Number(selectedCompany.current_price || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCompanyId('');
                  setSearchQuery('');
                }}
              >
                Ganti PT
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik kode (misal: AGWP, ABMP, ARGR) atau nama PT..."
                  className="input pl-9 text-xs"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950/80 border border-slate-800 p-1.5 space-y-1">
                {filteredCompanies.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    Tidak ditemukan emiten yang cocok dengan "{searchQuery}"
                  </div>
                ) : (
                  filteredCompanies.map((c) => (
                    <div
                      key={c.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedCompanyId(c.id);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors border border-transparent hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {c.symbol}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">{c.name}</span>
                          <span className="text-[10px] text-slate-400">{c.sector}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-slate-200 block">
                          IB {Number(c.current_price || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[9px] text-rose-400 font-semibold">Pilih Emiten</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="label">Batas Waktu Suspensi (Berakhir Otomatis)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => applyPresetHours(1)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              1 Jam
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(6)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              6 Jam
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(24)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-bold text-rose-300"
            >
              1 Hari (24 Jam)
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(72)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              3 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(168)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              7 Hari (1 Minggu)
            </button>
          </div>

          <Input
            type="datetime-local"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
            required
          />
        </div>

        <FormField label="Alasan Resmi Penghentian (Suspensi)" hint="Akan dicantumkan pada pengumuman resmi keterbukaan informasi bursa">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Alasan suspensi perdagangan saham..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
