import type { ElectricalFixture } from "../lib/types";
import { electricalColors } from "../lib/colors";
import { SCALE } from "./RoomRect";

const SYMBOL_SIZE = 8;

function OutletSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - SYMBOL_SIZE / 2}, ${y - SYMBOL_SIZE / 2})`}>
      <circle cx={SYMBOL_SIZE / 2} cy={SYMBOL_SIZE / 2} r={SYMBOL_SIZE / 2} fill="white" stroke={color} strokeWidth={1.2} />
      <line x1={SYMBOL_SIZE / 2 - 2} y1={SYMBOL_SIZE / 2 - 1} x2={SYMBOL_SIZE / 2 - 2} y2={SYMBOL_SIZE / 2 + 1} stroke={color} strokeWidth={1.5} />
      <line x1={SYMBOL_SIZE / 2 + 2} y1={SYMBOL_SIZE / 2 - 1} x2={SYMBOL_SIZE / 2 + 2} y2={SYMBOL_SIZE / 2 + 1} stroke={color} strokeWidth={1.5} />
    </g>
  );
}

function SwitchSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x - SYMBOL_SIZE / 2}, ${y - SYMBOL_SIZE / 2})`}>
      <circle cx={SYMBOL_SIZE / 2} cy={SYMBOL_SIZE / 2} r={SYMBOL_SIZE / 2} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={SYMBOL_SIZE / 2} y={SYMBOL_SIZE / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={6} fontWeight={700} fill={color}>S</text>
    </g>
  );
}

function LightSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  const r = SYMBOL_SIZE / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={r} fill="white" stroke={color} strokeWidth={1.2} />
      <line x1={-r + 1} y1={-r + 1} x2={r - 1} y2={r - 1} stroke={color} strokeWidth={0.8} />
      <line x1={r - 1} y1={-r + 1} x2={-r + 1} y2={r - 1} stroke={color} strokeWidth={0.8} />
    </g>
  );
}

function SmokeDetectorSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={700} fill={color}>SD</text>
    </g>
  );
}

function ThermostatSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-SYMBOL_SIZE / 2} y={-SYMBOL_SIZE / 2} width={SYMBOL_SIZE} height={SYMBOL_SIZE} rx={1} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={700} fill={color}>T</text>
    </g>
  );
}

function PanelSymbol({ x, y, color }: { x: number; y: number; color: string }) {
  const s = SYMBOL_SIZE + 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={1} fill="white" stroke={color} strokeWidth={1.5} />
      <line x1={-s / 2 + 2} y1={-2} x2={s / 2 - 2} y2={-2} stroke={color} strokeWidth={0.8} />
      <line x1={-s / 2 + 2} y1={0} x2={s / 2 - 2} y2={0} stroke={color} strokeWidth={0.8} />
      <line x1={-s / 2 + 2} y1={2} x2={s / 2 - 2} y2={2} stroke={color} strokeWidth={0.8} />
    </g>
  );
}

function GenericElectricalSymbol({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={SYMBOL_SIZE / 2} fill="white" stroke={color} strokeWidth={1.2} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={5} fontWeight={600} fill={color}>{label}</text>
    </g>
  );
}

export default function ElectricalOverlay({ fixtures }: { fixtures: ElectricalFixture[] }) {
  return (
    <g>
      {fixtures.map((f) => {
        const px = f.x * SCALE;
        const py = f.y * SCALE;
        const color = electricalColors[f.type] ?? "#6B7280";

        const key = f.id;
        switch (f.type) {
          case "outlet":
          case "gfci_outlet":
            return <OutletSymbol key={key} x={px} y={py} color={color} />;
          case "switch":
          case "dimmer":
          case "three_way_switch":
            return <SwitchSymbol key={key} x={px} y={py} color={color} />;
          case "ceiling_light":
          case "recessed_light":
          case "pendant":
          case "sconce":
          case "ceiling_fan":
            return <LightSymbol key={key} x={px} y={py} color={color} />;
          case "smoke_detector":
            return <SmokeDetectorSymbol key={key} x={px} y={py} color={color} />;
          case "thermostat":
            return <ThermostatSymbol key={key} x={px} y={py} color={color} />;
          case "panel":
            return <PanelSymbol key={key} x={px} y={py} color={color} />;
          default:
            return <GenericElectricalSymbol key={key} x={px} y={py} color={color} label="E" />;
        }
      })}
    </g>
  );
}
