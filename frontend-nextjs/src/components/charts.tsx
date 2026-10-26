"use client";

import { useId } from "react";
import { weekdayId } from "@/lib/format";
import type { ProfitPoint } from "@/lib/domain";

export function ProfitChart({ data }: { data: ProfitPoint[] }) {
  const titleId = useId();
  const width = 680;
  const height = 240;
  const padding = { top: 18, right: 16, bottom: 34, left: 62 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((point) => point.omzet));
  const slot = innerWidth / Math.max(data.length, 1);
  const barWidth = slot * 0.46;

  const x = (index: number) => padding.left + slot * index + slot / 2;
  const y = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;

  const linePoints = data.map((point, index) => `${x(index)},${y(point.laba)}`).join(" ");
  const gridValues = [0, max / 2, max];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={titleId}>Omzet dan laba bersih tujuh hari terakhir</title>
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={y(value) + 4} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
              {Math.round(value / 1000)}rb
            </text>
          </g>
        ))}
        {data.map((point, index) => (
          <g key={point.day}>
            <rect
              x={x(index) - barWidth / 2}
              y={y(point.omzet)}
              width={barWidth}
              height={padding.top + innerHeight - y(point.omzet)}
              rx="6"
              fill="var(--primary)"
              opacity="0.85"
            />
            <text x={x(index)} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">
              {weekdayId(point.day)}
            </text>
          </g>
        ))}
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((point, index) => (
          <circle key={point.day} cx={x(index)} cy={y(point.laba)} r="4" fill="var(--gold)" />
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded bg-primary" aria-hidden />Omzet harian
        </span>
        <span className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-full bg-gold" aria-hidden />Laba bersih
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Omzet dan laba bersih tujuh hari terakhir</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Omzet</th>
            <th scope="col">Laba bersih</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <th scope="row">{point.day}</th>
              <td>{point.omzet}</td>
              <td>{point.laba}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function MarginGauge({ margin, target }: { margin: number; target: number }) {
  const titleId = useId();
  const radius = 64;
  const centerX = 90;
  const centerY = 84;
  const clamped = Math.max(0, Math.min(margin, 60));
  const angle = -90 + (clamped / 60) * 180;
  const needleX = centerX + Math.cos((angle * Math.PI) / 180) * (radius - 12);
  const needleY = centerY + Math.sin((angle * Math.PI) / 180) * (radius - 12);
  const thresholdAngle = -90 + (Math.min(target, 60) / 60) * 180;
  const thresholdX = centerX + Math.cos((thresholdAngle * Math.PI) / 180) * radius;
  const thresholdY = centerY + Math.sin((thresholdAngle * Math.PI) / 180) * radius;
  const tone = margin >= target ? "var(--healthy)" : margin >= target - 10 ? "var(--warning)" : "var(--critical)";

  return (
    <figure className="m-0 flex items-center gap-4">
      <svg viewBox="0 0 180 100" className="h-24 w-40 shrink-0" role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          Margin {margin} persen, batas aman {target} persen
        </title>
        <path d="M26 84 A64 64 0 0 1 154 84" fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M26 84 A64 64 0 0 1 154 84"
          fill="none"
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(margin, 60) / 60) * 201} 201`}
        />
        <line
          x1={centerX}
          y1={centerY}
          x2={thresholdX}
          y2={thresholdY}
          stroke="var(--warning)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <line x1={centerX} y1={centerY} x2={needleX} y2={needleY} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={centerX} cy={centerY} r="5" fill="var(--ink)" />
        <text x={centerX} y="98" textAnchor="middle" fontSize="11" fill="var(--ink-soft)">
          {margin}%
        </text>
      </svg>
      <figcaption className="text-sm leading-6 text-ink-soft">
        Batas aman margin <b className="text-ink">{target}%</b>. Jarum menunjukkan margin menu terpilih.
      </figcaption>
    </figure>
  );
}

export function ExpiryHeatmap({
  rows,
  days,
}: {
  rows: { itemId: string; itemName: string; unit: string; counts: number[] }[];
  days: string[];
}) {
  const titleId = useId();

  const cellTone = (count: number) => {
    if (count >= 3) return "bg-critical text-white";
    if (count === 2) return "bg-critical-soft text-critical";
    if (count === 1) return "bg-warning-soft text-warning";
    return "bg-line/50 text-ink-soft";
  };

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${Math.max(days.length * 46, 320)} ${Math.max(rows.length * 30 + 28, 60)}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>Peta sebaran batch yang kedaluwarsa tujuh hari ke depan</title>
        {days.map((day, column) => (
          <text
            key={day}
            x={column * 46 + 21}
            y="16"
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-soft)"
          >
            {day.slice(8)}/10
          </text>
        ))}
        {rows.map((row, rowIndex) => (
          <g key={row.itemId}>
            <text x="0" y={rowIndex * 30 + 38} fontSize="10" fill="var(--ink-soft)">
              {row.itemName.slice(0, 12)}
            </text>
            {row.counts.map((count, column) => (
              <rect
                key={`${row.itemId}-${column}`}
                x={column * 46 + 2}
                y={rowIndex * 30 + 22}
                width="38"
                height="24"
                rx="6"
                className={cellTone(count)}
              />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-line/50" aria-hidden />Tidak ada batch
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-warning-soft" aria-hidden />1 batch
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-critical-soft" aria-hidden />2 batch
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-critical" aria-hidden />3 batch atau lebih
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Jumlah batch per barang dan tanggal kedaluwarsa</caption>
        <thead>
          <tr>
            <th scope="col">Barang</th>
            {days.map((day) => (
              <th scope="col" key={day}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.itemId}>
              <th scope="row">{row.itemName}</th>
              {row.counts.map((count, index) => (
                <td key={`${row.itemId}-${index}`}>{count}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function Sparkline({ values, tone = "primary" }: { values: number[]; tone?: "primary" | "warning" | "critical" }) {
  const titleId = useId();
  const width = 120;
  const height = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - 3 - ((value - min) / span) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = tone === "critical" ? "var(--critical)" : tone === "warning" ? "var(--warning)" : "var(--primary)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-28" role="img" aria-labelledby={titleId}>
      <title id={titleId}>Grafik sisa hari tiap batch</title>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type BarRow = {
  label: string;
  value: number;
  hint?: string;
  tone?: "primary" | "gold" | "critical" | "warning" | "healthy";
};

export function BarList({ rows, formatValue }: { rows: BarRow[]; formatValue: (value: number) => string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const tones: Record<string, string> = {
    primary: "bg-primary",
    gold: "bg-gold",
    critical: "bg-critical",
    warning: "bg-warning",
    healthy: "bg-healthy",
  };

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold">{row.label}</span>
            <span className="shrink-0 text-sm font-bold tabular">{formatValue(row.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/60">
            <div
              className={`h-full rounded-full ${tones[row.tone ?? "primary"]}`}
              style={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%` }}
            />
          </div>
          {row.hint && <p className="mt-1 text-xs text-ink-soft">{row.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
