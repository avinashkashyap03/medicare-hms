import { useState } from 'react';
import { patientVisits, patientVisitsWeekly, patientVisitsYearly } from '@/data/mockData.js';
import WidgetHeader from './WidgetHeader.jsx';

const W = 720;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 34, left: 42 };

const dataByRange = {
  Weekly: patientVisitsWeekly,
  Monthly: patientVisits,
  Yearly: patientVisitsYearly,
};

const subtitles = {
  Weekly: 'Overview of patient visits this week',
  Monthly: 'Overview of patient visits across the year',
  Yearly: 'Overview of patient visits across recent years',
};

function formatTick(value) {
  if (value >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(value);
}

function PatientVisitsChart() {
  const [range, setRange] = useState('Monthly');
  const ranges = ['Weekly', 'Monthly', 'Yearly'];
  const data = dataByRange[range];

  if (data.length < 2) return null;

  const peak = data.reduce((a, b) => (b.v > a.v ? b : a));

  const min = Math.min(...data.map((d) => d.v));
  const max = Math.max(...data.map((d) => d.v));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const padY = (max - min) * 0.15;

  const x = (i) => PAD.left + (i / (data.length - 1)) * innerW;
  const y = (v) => PAD.top + innerH - ((v - (min - padY)) / (max - min + padY * 2)) * innerH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.v)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;

  const grid = Array.from({ length: 5 }, (_, i) => min - padY + ((max + padY - (min - padY)) / 4) * i);

  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter((_, j) => j % 2 === 0);

  return (
    <section className="card widget chart-widget">
      <WidgetHeader
        title="Patient Visits"
        subtitle={subtitles[range]}
        action={
          <div className="seg-control">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                className={r === range ? 'active' : ''}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" style={{ width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="visit-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {grid.map((g) => (
            <line key={g} x1={PAD.left} y1={y(g)} x2={W - PAD.right} y2={y(g)} className="chart-grid" />
          ))}
          {grid.map((g) => (
            <text key={g} x={PAD.left - 10} y={y(g) + 4} className="chart-tick" textAnchor="end">
              {formatTick(g)}
            </text>
          ))}

          <path d={area} fill="url(#visit-area)" />
          <path d={line} className="chart-line" />

          {data.map((d, i) => (
            <circle key={d.m} cx={x(i)} cy={y(d.v)} r={i === data.length - 1 ? 4 : 2.5} className="chart-dot" />
          ))}

          {xLabels.map(({ d, i }) => (
            <text key={d.m} x={x(i)} y={H - 10} className="chart-xtick" textAnchor="middle">
              {d.m}
            </text>
          ))}
        </svg>
      </div>
      <div className="chart-tooltip">
        {peak.m} had the highest visits at {formatTick(peak.v)}
      </div>
    </section>
  );
}

export default PatientVisitsChart;