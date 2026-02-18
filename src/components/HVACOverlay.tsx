import type { HVACElement, DuctRun } from "../lib/types";
import { hvacColors } from "../lib/colors";
import { SCALE } from "./RoomRect";

function SupplyVent({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const lineCount = Math.max(2, Math.floor(h / 4));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="white" stroke={color} strokeWidth={1.2} rx={1} />
      {Array.from({ length: lineCount }, (_, i) => {
        const ly = y + (h / (lineCount + 1)) * (i + 1);
        return <line key={i} x1={x + 2} y1={ly} x2={x + w - 2} y2={ly} stroke={color} strokeWidth={0.6} />;
      })}
    </g>
  );
}

function ReturnVent({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="white" stroke={color} strokeWidth={1.2} rx={1} />
      <line x1={x + 2} y1={y + 2} x2={x + w - 2} y2={y + h - 2} stroke={color} strokeWidth={0.6} />
      <line x1={x + w - 2} y1={y + 2} x2={x + 2} y2={y + h - 2} stroke={color} strokeWidth={0.6} />
    </g>
  );
}

function ThermostatSymbol({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={6} fontWeight={700} fill={color}>T</text>
    </g>
  );
}

function ExhaustFanSymbol({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 1;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} fill="white" stroke={color} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={0.8} />
      <line x1={cx} y1={cy - r + 1} x2={cx} y2={cy + r - 1} stroke={color} strokeWidth={0.6} />
      <line x1={cx - r + 1} y1={cy} x2={cx + r - 1} y2={cy} stroke={color} strokeWidth={0.6} />
    </g>
  );
}

function GenericHVAC({ x, y, w, h, color, label }: { x: number; y: number; w: number; h: number; color: string; label: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(7, w / 3)} fontWeight={600} fill={color}>{label}</text>
    </g>
  );
}

const DUCT_COLORS: Record<string, string> = {
  supply: "#3B82F6",
  return: "#EF4444",
  exhaust: "#8B5CF6",
};

export default function HVACOverlay({
  elements,
  ductRuns,
}: {
  elements: HVACElement[];
  ductRuns: DuctRun[];
}) {
  return (
    <g>
      {/* Duct runs */}
      {ductRuns.map((run) => {
        if (run.points.length < 2) return null;
        const d = run.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * SCALE} ${p.y * SCALE}`)
          .join(" ");
        return (
          <path
            key={run.id}
            d={d}
            fill="none"
            stroke={DUCT_COLORS[run.type] ?? "#6B7280"}
            strokeWidth={run.widthInches / 6}
            strokeDasharray="6 3"
            opacity={0.5}
          />
        );
      })}

      {/* HVAC elements */}
      {elements.map((e) => {
        const px = e.x * SCALE;
        const py = e.y * SCALE;
        const pw = e.width * SCALE;
        const ph = e.height * SCALE;
        const color = hvacColors[e.type] ?? "#6B7280";

        switch (e.type) {
          case "supply_vent":
            return <SupplyVent key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "return_vent":
            return <ReturnVent key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "thermostat":
            return <ThermostatSymbol key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "exhaust_fan":
            return <ExhaustFanSymbol key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "outdoor_unit":
            return <GenericHVAC key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="AC" />;
          case "furnace":
            return <GenericHVAC key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="FUR" />;
          case "mini_split":
            return <GenericHVAC key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="MS" />;
          default:
            return <GenericHVAC key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="H" />;
        }
      })}
    </g>
  );
}
