import React, { useState } from 'react';
import {
  Landmark,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Activity,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { API_URL } from '../../config/env';

export function AdminLoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Mohon masukkan Username dan Kata Sandi Otoritas Admin.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.login(cleanUser, password);
      if (res && res.token && res.user) {
        onLoginSuccess({
          token: res.token,
          user: res.user,
          remember: rememberMe,
        });
      } else {
        setError('Respons autentikasi dari server tidak valid.');
      }
    } catch (err) {
      setError(err.message || 'Gagal melakukan autentikasi ke server otoritas bursa.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Ambient Glows */}
      <div className="pointer-events-none absolute -top-36 -left-36 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-36 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        {/* Top Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/40 shadow-lg shadow-sky-950/50 mb-4">
            <Landmark className="w-8 h-8 text-sky-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-bold tracking-wider uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Portal Otoritas Terproteksi
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            BANK SENTRAL & BURSA IPMC
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konsol Komando Moneter, Pengawasan Bursa & Peradilan Niaga Capital Federation
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400" />
                Autentikasi Administrator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Masukkan kredensial Gubernur Bank Sentral / Regulator
              </p>
            </div>
            <button
              type="button"
              onClick={fillDefaultCredentials}
              title="Isi otomatis kredensial default admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-semibold text-sky-300 transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Isi Default
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username Otoritas
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  autoComplete="username"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070b14] border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi Otoritas
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi admin..."
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#070b14] border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
                Simpan sesi otoritas di browser ini
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Default: admin / admin123
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 disabled:opacity-60 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  MEMVERIFIKASI OTORITAS...
                </>
              ) : (
                <>
                  MASUK KE KONSOL BANK SENTRAL
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Endpoint Info */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Node Server Bursa:
            </span>
            <code className="px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-slate-800 font-mono">
              {API_URL}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

