import { useId } from 'react';

function Sparkline({ data, color = '#2563eb', width = 96, height = 32, strokeWidth = 2 }) {
  const gradId = `spark-grad-${useId().replace(/:/g, '')}`;

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y];
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

export default Sparkline;