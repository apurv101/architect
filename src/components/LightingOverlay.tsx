import type { LightFixture } from "../lib/types";
import { lightingColors } from "../lib/colors";
import { SCALE } from "./RoomRect";

function CeilingLight({ x, y, color, radius }: { x: number; y: number; color: string; radius: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill={color} opacity={0.1} />
      <circle cx={x} cy={y} r={radius} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.4} />
      <circle cx={x} cy={y} r={4} fill="white" stroke={color} strokeWidth={1.2} />
      <line x1={x - 2.5} y1={y - 2.5} x2={x + 2.5} y2={y + 2.5} stroke={color} strokeWidth={0.8} />
      <line x1={x + 2.5} y1={y - 2.5} x2={x - 2.5} y2={y + 2.5} stroke={color} strokeWidth={0.8} />
    </g>
  );
}

function RecessedLight({ x, y, color, radius }: { x: number; y: number; color: string; radius: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill={color} opacity={0.08} />
      <circle cx={x} cy={y} r={radius} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="2 2" opacity={0.3} />
      <circle cx={x} cy={y} r={3} fill={color} opacity={0.6} />
      <circle cx={x} cy={y} r={3} fill="none" stroke={color} strokeWidth={0.8} />
    </g>
  );
}

function PendantLight({ x, y, color, radius }: { x: number; y: number; color: string; radius: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill={color} opacity={0.1} />
      <circle cx={x} cy={y} r={radius} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.4} />
      <circle cx={x} cy={y} r={4} fill="white" stroke={color} strokeWidth={1.2} />
      <circle cx={x} cy={y} r={2} fill={color} opacity={0.8} />
    </g>
  );
}

function SconceLight({ x, y, color, radius }: { x: number; y: number; color: string; radius: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill={color} opacity={0.08} />
      <rect x={x - 3} y={y - 3} width={6} height={6} rx={1} fill="white" stroke={color} strokeWidth={1} />
      <circle cx={x} cy={y} r={1.5} fill={color} opacity={0.7} />
    </g>
  );
}

function GenericLight({ x, y, color, radius, label }: { x: number; y: number; color: string; radius: number; label: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill={color} opacity={0.08} />
      <circle cx={x} cy={y} r={radius} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="2 2" opacity={0.3} />
      <circle cx={x} cy={y} r={4} fill="white" stroke={color} strokeWidth={1} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={600} fill={color}>{label}</text>
    </g>
  );
}

export default function LightingOverlay({ fixtures }: { fixtures: LightFixture[] }) {
  return (
    <g>
      {fixtures.map((f) => {
        const px = f.x * SCALE;
        const py = f.y * SCALE;
        const radius = f.coverageRadius * SCALE;
        const color = lightingColors[f.type] ?? "#FBBF24";

        switch (f.type) {
          case "ceiling":
          case "ceiling_fan" as string:
            return <CeilingLight key={f.id} x={px} y={py} color={color} radius={radius} />;
          case "recessed":
            return <RecessedLight key={f.id} x={px} y={py} color={color} radius={radius} />;
          case "pendant":
          case "chandelier":
            return <PendantLight key={f.id} x={px} y={py} color={color} radius={radius} />;
          case "sconce":
            return <SconceLight key={f.id} x={px} y={py} color={color} radius={radius} />;
          default:
            return <GenericLight key={f.id} x={px} y={py} color={color} radius={radius} label={f.type.charAt(0).toUpperCase()} />;
        }
      })}
    </g>
  );
}
