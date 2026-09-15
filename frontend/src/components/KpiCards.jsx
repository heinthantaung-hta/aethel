const cardConfig = [
  {
    label: 'Total', key: 'total',
    bg: 'linear-gradient(135deg, rgba(229,9,20,0.12), rgba(229,9,20,0.06))',
    border: 'rgba(229,9,20,0.2)',
    color: '#E50914',
    icon: TotalIcon,
  },
  {
    label: 'Watched', key: 'completed',
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))',
    border: 'rgba(16,185,129,0.2)',
    color: '#10b981',
    icon: CheckIcon,
  },
  {
    label: 'Watching', key: 'in_progress',
    bg: 'linear-gradient(135deg, rgba(245,197,24,0.12), rgba(245,197,24,0.06))',
    border: 'rgba(245,197,24,0.2)',
    color: '#F5C518',
    icon: ProgressIcon,
  },
  {
    label: 'Watchlist', key: 'backlog',
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))',
    border: 'rgba(59,130,246,0.2)',
    color: '#3b82f6',
    icon: BacklogIcon,
  },
];

export default function KpiCards({ stats, loading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cardConfig.map((c) => (
        <div key={c.label}
          className="rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
          }}>
          {loading ? (
            <div className="animate-pulse space-y-2.5">
              <div className="h-3 rounded w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-7 rounded w-12" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.color, opacity: 0.8 }}>{c.label}</span>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
              <p className="text-3xl font-black" style={{ color: c.color }}>{stats?.[c.key] ?? 0}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function TotalIcon({ className, style }) {
  return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
}
function CheckIcon({ className, style }) {
  return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ProgressIcon({ className, style }) {
  return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function BacklogIcon({ className, style }) {
  return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>;
}
