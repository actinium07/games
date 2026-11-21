import React from 'react';

interface QuantumDieProps {
  value: number | null;
  rolling: boolean;
  disabled: boolean;
  onRoll: () => void;
  label?: string;
}

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[28, 28]],
  2: [[16, 16], [40, 40]],
  3: [[16, 16], [28, 28], [40, 40]],
  4: [[16, 16], [40, 16], [16, 40], [40, 40]],
  5: [[16, 16], [40, 16], [28, 28], [16, 40], [40, 40]],
  6: [[16, 15], [40, 15], [16, 28], [40, 28], [16, 41], [40, 41]],
};

export const QuantumDie: React.FC<QuantumDieProps> = ({
  value,
  rolling,
  disabled,
  onRoll,
  label = 'Roll Die',
}) => {
  const pips = value ? PIP_POSITIONS[value] : PIP_POSITIONS[6];

  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={disabled}
      aria-label={label}
      className={`group flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        disabled
          ? 'bg-slate-900 border-slate-800 text-slate-400'
          : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_24px_rgba(34,211,238,0.2)] active:scale-[0.97]'
      }`}
    >
      <svg
        viewBox="0 0 56 56"
        className={`w-11 h-11 shrink-0 transition-transform duration-200 ${rolling ? 'rotate-180 scale-95' : 'group-hover:scale-105'}`}
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="50"
          height="50"
          rx="12"
          fill="#0f172a"
          stroke={disabled ? '#475569' : '#22d3ee'}
          strokeWidth="2.5"
        />
        {pips.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r="4.2"
            fill={value === 6 ? '#f59e0b' : disabled ? '#64748b' : '#22d3ee'}
          />
        ))}
      </svg>
      <div className="text-left">
        <div className="font-display text-sm font-bold leading-tight">{label}</div>
        <div className="font-mono-tabular text-xs text-slate-400 mt-0.5">
          {rolling ? 'Rolling...' : value !== null ? `Result: ${value}` : 'Ready [Space]'}
        </div>
      </div>
    </button>
  );
};
