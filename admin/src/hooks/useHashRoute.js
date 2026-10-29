import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PAGE, NAV_ITEMS } from '../config/navigation';

const read = () => {
  const id = window.location.hash.replace('#/', '').replace('#', '');
  return NAV_ITEMS.some((i) => i.id === id) ? id : DEFAULT_PAGE;
};

/** Routing sederhana berbasis hash — halaman tetap sama saat di-refresh. */
export function useHashRoute() {
  const [page, setPage] = useState(read);

  useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((id) => {
    window.location.hash = `/${id}`;
  }, []);

  return [page, go];
}
