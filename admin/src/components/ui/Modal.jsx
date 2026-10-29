import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = 'var(--gold)',
  width = 560,
  maxWidth,
  className = '',
  footer,
  children,
}) {
  const isModalOpen = Boolean(open ?? isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = origOverflow;
    };
  }, [isModalOpen, onClose]);

  if (!isModalOpen || !mounted) return null;

  // Resolve custom width or maxWidth
  const styleWidth = typeof width === 'number' ? `${width}px` : width;

  const content = (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`modal ${typeof maxWidth === 'string' && maxWidth.startsWith('max-w-') ? maxWidth : ''} ${className}`}
        style={{ maxWidth: styleWidth }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header (Sticky at top) */}
        <div
          className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b shrink-0 bg-slate-900/90"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div
                className="p-2.5 rounded-xl shrink-0"
                style={{ background: 'rgba(255,255,255,.05)', color: tone }}
              >
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight text-slate-100">{title}</h3>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon shrink-0 text-slate-400 hover:text-slate-100"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body (Always within screen view) */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(88vh-140px)] flex-1">
          {children}
        </div>

        {/* Footer (Sticky at bottom) */}
        {footer && (
          <div
            className="px-6 py-4 border-t flex justify-end gap-2 shrink-0 bg-slate-950/80 backdrop-blur-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
