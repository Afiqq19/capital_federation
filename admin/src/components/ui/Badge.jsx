export default function Badge({ tone = 'slate', pulse = false, children, className = '', title }) {
  return (
    <span className={`badge badge-${tone} ${pulse ? 'badge-pulse' : ''} ${className}`} title={title}>
      {children}
    </span>
  );
}
