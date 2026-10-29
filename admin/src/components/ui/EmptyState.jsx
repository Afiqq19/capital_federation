export default function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="py-12 text-center">
      {Icon && (
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl grid place-items-center" style={{ background: 'rgba(255,255,255,.04)', color: 'var(--text-faint)' }}>
          <Icon size={22} />
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>{title}</p>
      {text && <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{text}</p>}
    </div>
  );
}
