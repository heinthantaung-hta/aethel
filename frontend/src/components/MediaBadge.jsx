const TYPE_CONFIG = {
  'Movie': { bg: 'bg-[rgba(16,185,129,0.1)]50', text: 'text-[#10b981]600', border: 'border-emerald-200', dot: 'bg-[rgba(16,185,129,0.1)]500' },
  'Video Game': { bg: 'bg-[rgba(245,197,24,0.1)]50', text: 'text-[#F5C518]600', border: 'border-amber-200', dot: 'bg-[rgba(245,197,24,0.1)]500' },
  'Book': { bg: 'bg-[rgba(96,165,250,0.1)]50', text: 'text-[#60a5fa]600', border: 'border-sky-200', dot: 'bg-[rgba(96,165,250,0.1)]500' },
};

export default function MediaBadge({ type, size = 'sm' }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG['Movie'];
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {type}
    </span>
  );
}
