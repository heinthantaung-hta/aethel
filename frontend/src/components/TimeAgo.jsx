const UNITS = [
  { max: 60, divisor: 1, unit: 'second' },
  { max: 3600, divisor: 60, unit: 'minute' },
  { max: 86400, divisor: 3600, unit: 'hour' },
  { max: 2592000, divisor: 86400, unit: 'day' },
  { max: 31536000, divisor: 2592000, unit: 'month' },
  { max: Infinity, divisor: 31536000, unit: 'year' },
];

export default function TimeAgo({ date }) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const style = { color: '#5a5f6e', fontSize: '11px', fontWeight: 500 };

  if (seconds < 10) return <span style={style}>just now</span>;

  for (const { max, divisor, unit } of UNITS) {
    if (seconds < max) {
      const value = Math.floor(seconds / divisor);
      return <span style={style}>{value}{unit.charAt(0)} ago</span>;
    }
  }

  return <span style={style}>a while ago</span>;
}

