"use client";

import { Strategy } from "../types";

interface Props {
  core: Strategy;
  satellites: Strategy[];
  onReset: () => void;
}

function ReturnBadge({ value }: { value: number }) {
  const color = value >= 0 ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function Portfolio({ core, satellites, onReset }: Props) {
  const totalWeight = [core, ...satellites].reduce((a, s) => a + s.weight, 0);
  const weightedReturn = [core, ...satellites].reduce(
    (a, s) => a + (s.return * s.weight) / 100,
    0
  );
  const weightedReturnNorm = totalWeight > 0 ? (weightedReturn / totalWeight) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* Sommario */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Riepilogo portafoglio</div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300 text-sm">Rendimento medio</span>
          <ReturnBadge value={weightedReturnNorm} />
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300 text-sm">Strategie totali</span>
          <span className="text-white font-semibold">{satellites.length + 1}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300 text-sm">Peso allocato</span>
          <span className="text-white font-semibold">{totalWeight.toFixed(1)}%</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Legenda</div>
        <div className="space-y-2 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-base">☀️</span>
            <span>Nucleo (strategia core)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-green-400" />
            <span>Orbita oraria = rendimento positivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-red-400" />
            <span>Orbita antioraria = perdita</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1 items-end">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-5 h-5 rounded-full bg-gray-400" />
              <div className="w-8 h-8 rounded-full bg-gray-400" />
            </div>
            <span>Dimensione = peso %</span>
          </div>
        </div>
      </div>

      {/* Core */}
      <div className="bg-yellow-500/10 border border-yellow-600/40 rounded-xl p-3">
        <div className="text-xs text-yellow-400 uppercase tracking-wider mb-2">☀️ Core</div>
        <div className="font-semibold text-white text-sm mb-1">{core.name}</div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Peso: <span className="text-white">{core.weight.toFixed(1)}%</span></span>
          <ReturnBadge value={core.return} />
        </div>
      </div>

      {/* Satelliti */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 flex-1">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">
          Satelliti ({satellites.length})
        </div>
        <div className="space-y-2">
          {satellites.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-gray-900/50 rounded-lg p-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: ORBIT_COLORS[i % ORBIT_COLORS.length] }}
                />
                <span className="text-gray-200 truncate" title={s.name}>{s.name}</span>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <span className="text-gray-500">{s.weight.toFixed(1)}%</span>
                <ReturnBadge value={s.return} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
      >
        Carica nuovo file
      </button>
    </div>
  );
}

const ORBIT_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];
