export default function PaginationBar({
  totalItems = 0,
  page = 1,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'data',
}) {
  if (totalItems <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-800/80 text-xs text-slate-400">
      <div className="flex items-center gap-2 flex-wrap">
        <span>
          Menampilkan <strong className="text-slate-200">{startIndex + 1}</strong> -{' '}
          <strong className="text-slate-200">{Math.min(startIndex + pageSize, totalItems)}</strong> dari{' '}
          <strong className="text-slate-200">{totalItems}</strong> {itemLabel}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              if (onPageChange) onPageChange(1);
            }}
            className="select py-1 px-2 text-xs bg-slate-900 border-slate-800 rounded-lg text-slate-200"
          >
            <option value={25}>25 per hal</option>
            <option value={50}>50 per hal</option>
            <option value={100}>100 per hal</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange && onPageChange(1)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer transition"
        >
          «
        </button>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange && onPageChange(Math.max(1, safePage - 1))}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer transition"
        >
          ‹ Prev
        </button>
        <span className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-amber-300 font-mono font-bold">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, safePage + 1))}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer transition"
        >
          Next ›
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange && onPageChange(totalPages)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer transition"
        >
          »
        </button>
      </div>
    </div>
  );
}

