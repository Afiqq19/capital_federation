import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Select } from '../../components/ui/Form';
import { Users, Shield, Building2, CreditCard } from 'lucide-react';
import { ib } from '../../lib/format';

export default function EditUserModal({ open, onClose, user, onConfirm }) {
  const [balance, setBalance] = useState('');
  const [companyBalance, setCompanyBalance] = useState('');
  const [creditScore, setCreditScore] = useState(700);
  const [creditTier, setCreditTier] = useState('STANDARD');
  const [role, setRole] = useState('PLAYER');
  const [ptName, setPtName] = useState('');
  const [sector, setSector] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setBalance(String(user.balance_ib ?? user.cash_balance_ib ?? 0));
      setCompanyBalance(String(user.company_balance_ib ?? 0));
      setCreditScore(user.credit_score ?? 700);
      setCreditTier(user.credit_tier ?? 'STANDARD');
      setRole(user.role ?? 'PLAYER');
      setPtName(user.pt_name ?? '');
      setSector(user.sector ?? 'Finance');
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onConfirm(user.id, {
        balance_ib: Number(balance),
        cash_balance_ib: Number(balance),
        company_balance_ib: Number(companyBalance),
        credit_score: Number(creditScore),
        credit_tier: creditTier,
        role,
        pt_name: ptName,
        sector,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profil & Finansial Konglomerat"
      subtitle={`Kelola data ${user.name || user.username} (@${user.username}) • ID: ${user.id}`}
      icon={Users}
      tone="var(--violet)"
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="violet" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Saldo Kas Pribadi (IB)" hint="Uang likuid cair di rekening pribadi">
            <Input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Kas PT Utama (IB)" hint="Saldo brankas kas operasional PT">
            <Input
              type="number"
              value={companyBalance}
              onChange={(e) => setCompanyBalance(e.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nama PT Utama">
            <Input
              value={ptName}
              onChange={(e) => setPtName(e.target.value)}
              placeholder="Contoh: PT. Maju Sukses Makmur"
            />
          </FormField>

          <FormField label="Sektor Usaha">
            <Select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="Finance">Finance</option>
              <option value="Technology">Technology</option>
              <option value="Energy">Energy</option>
              <option value="Consumer Goods">Consumer Goods</option>
              <option value="Property">Property</option>
              <option value="Healthcare">Healthcare</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Skor Kredit (0-1000)">
            <Input
              type="number"
              min="0"
              max="1000"
              value={creditScore}
              onChange={(e) => setCreditScore(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Tingkat Kredit (Tier)">
            <Select value={creditTier} onChange={(e) => setCreditTier(e.target.value)}>
              <option value="STANDARD">Standard</option>
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </Select>
          </FormField>

          <FormField label="Hak Akses (Role)">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="PLAYER">PLAYER</option>
              <option value="VIP">VIP</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
