import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };
const COLORS = { success: 'var(--emerald)', error: 'var(--rose)', info: 'var(--sky)' };

export default function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2 w-[340px] max-w-[90vw]">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className="card flex items-start gap-3 px-4 py-3 page-enter"
            style={{ background: 'rgba(11,17,32,.96)', borderColor: COLORS[t.type] || 'var(--border)' }}
          >
            <Icon size={17} style={{ color: COLORS[t.type], marginTop: 1 }} />
            <p className="text-[13px] leading-snug">{t.text}</p>
          </div>
        );
      })}
    </div>
  );
}
