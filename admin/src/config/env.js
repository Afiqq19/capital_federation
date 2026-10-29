// Konfigurasi lingkungan — ubah via admin/.env  (VITE_API_URL=http://192.168.x.x:4000)
export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;
