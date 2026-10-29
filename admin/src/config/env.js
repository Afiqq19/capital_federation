// Konfigurasi lingkungan — otomatis mendeteksi Cloudflare Tunnel (https://capitalfederation.xie.my.id), Docker (:5000), maupun Vite Dev (:5173 -> :4000)
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? `http://${window.location.hostname}:4000`
    : typeof window !== 'undefined'
    ? window.location.origin
    : 'https://capitalfederation.xie.my.id');
