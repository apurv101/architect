import type { PlumbingFixture, PlumbingRun } from "../lib/types";
import { plumbingColors } from "../lib/colors";
import { SCALE } from "./RoomRect";

const SYMBOL_SIZE = 8;

function SupplySymbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="#DBEAFE" stroke="#3B82F6" strokeWidth={1.2} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={700} fill="#3B82F6">W</text>
    </g>
  );
}

function DrainSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="#F3F4F6" stroke="#6B7280" strokeWidth={1.2} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={700} fill="#6B7280">D</text>
    </g>
  );
}

function VentSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="#F9FAFB" stroke="#9CA3AF" strokeWidth={1.2} strokeDasharray="2 1" />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={700} fill="#9CA3AF">V</text>
    </g>
  );
}

function WaterHeaterSymbol({ x, y }: { x: number; y: number }) {
  const s = SYMBOL_SIZE + 4;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={2} fill="#FEE2E2" stroke="#EF4444" strokeWidth={1.5} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={700} fill="#EF4444">WH</text>
    </g>
  );
}

function ShutoffSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="#FEE2E2" stroke="#DC2626" strokeWidth={1.5} />
      <line x1={-2} y1={-2} x2={2} y2={2} stroke="#DC2626" strokeWidth={1.5} />
      <line x1={2} y1={-2} x2={-2} y2={2} stroke="#DC2626" strokeWidth={1.5} />
    </g>
  );
}

function GenericPlumbingSymbol({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={600} fill={color}>{label}</text>
    </g>
  );
}

const PIPE_COLORS: Record<string, string> = {
  hot_supply: "#EF4444",
  cold_supply: "#3B82F6",
  drain: "#6B7280",
  vent: "#9CA3AF",
};

const PIPE_DASH: Record<string, string | undefined> = {
  hot_supply: "4 2",
  cold_supply: "4 2",
  drain: undefined,
  vent: "2 2",
};

export default function PlumbingOverlay({
  fixtures,
  runs,
}: {
  fixtures: PlumbingFixture[];
  runs: PlumbingRun[];
}) {
  return (
    <g>
      {/* Pipe runs */}
      {runs.map((run) => {
        if (run.points.length < 2) return null;
        const d = run.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * SCALE} ${p.y * SCALE}`)
          .join(" ");
        return (
          <path
            key={run.id}
            d={d}
            fill="none"
            stroke={PIPE_COLORS[run.type] ?? "#6B7280"}
            strokeWidth={1.5}
            strokeDasharray={PIPE_DASH[run.type]}
            opacity={0.7}
          />
        );
      })}

      {/* Fixtures */}
      {fixtures.map((f) => {
        const px = f.x * SCALE;
        const py = f.y * SCALE;
        const color = plumbingColors[f.type] ?? "#6B7280";

        switch (f.type) {
          case "supply_line":
            return <SupplySymbol key={f.id} x={px} y={py} />;
          case "drain_line":
            return <DrainSymbol key={f.id} x={px} y={py} />;
          case "vent_stack":
            return <VentSymbol key={f.id} x={px} y={py} />;
          case "water_heater":
            return <WaterHeaterSymbol key={f.id} x={px} y={py} />;
          case "main_shutoff":
            return <ShutoffSymbol key={f.id} x={px} y={py} />;
          default:
            return <GenericPlumbingSymbol key={f.id} x={px} y={py} color={color} label="P" />;
        }
      })}
    </g>
  );
}
