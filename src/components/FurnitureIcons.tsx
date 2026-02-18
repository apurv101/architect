/**
 * Simple SVG icon shapes for each furniture type.
 * Each icon renders inside a normalized (0,0)→(1,1) coordinate space
 * and is scaled/translated by the caller.
 */

import type { FurnitureType } from "../lib/types";

interface IconProps {
  /** pixel width of the furniture rect */
  w: number;
  /** pixel height of the furniture rect */
  h: number;
  stroke?: string;
}

function BedIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  // Headboard bar at top, pillow rectangles, blanket area
  const pad = w * 0.1;
  return (
    <>
      {/* Headboard */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h * 0.06} rx={1} fill={stroke} opacity={0.7} />
      {/* Pillow(s) */}
      {w > 35 ? (
        <>
          <rect x={pad + 2} y={pad + h * 0.1} width={w * 0.35} height={h * 0.18} rx={2} fill="white" stroke={stroke} strokeWidth={0.6} />
          <rect x={w - pad - 2 - w * 0.35} y={pad + h * 0.1} width={w * 0.35} height={h * 0.18} rx={2} fill="white" stroke={stroke} strokeWidth={0.6} />
        </>
      ) : (
        <rect x={pad + 2} y={pad + h * 0.1} width={w - pad * 2 - 4} height={h * 0.18} rx={2} fill="white" stroke={stroke} strokeWidth={0.6} />
      )}
      {/* Blanket fold line */}
      <line x1={pad} y1={h * 0.55} x2={w - pad} y2={h * 0.55} stroke={stroke} strokeWidth={0.5} opacity={0.4} />
    </>
  );
}

function SofaIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.08;
  const armW = w * 0.1;
  const backH = h * 0.25;
  return (
    <>
      {/* Back rest */}
      <rect x={pad} y={pad} width={w - pad * 2} height={backH} rx={2} fill={stroke} opacity={0.25} />
      {/* Left arm */}
      <rect x={pad} y={pad} width={armW} height={h - pad * 2} rx={2} fill={stroke} opacity={0.2} />
      {/* Right arm */}
      <rect x={w - pad - armW} y={pad} width={armW} height={h - pad * 2} rx={2} fill={stroke} opacity={0.2} />
      {/* Seat cushion dividers */}
      {w > 50 && (
        <>
          <line x1={w * 0.38} y1={backH + pad} x2={w * 0.38} y2={h - pad} stroke={stroke} strokeWidth={0.4} opacity={0.3} />
          <line x1={w * 0.62} y1={backH + pad} x2={w * 0.62} y2={h - pad} stroke={stroke} strokeWidth={0.4} opacity={0.3} />
        </>
      )}
    </>
  );
}

function ToiletIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const cx = w / 2;
  return (
    <>
      {/* Tank */}
      <rect x={w * 0.2} y={h * 0.05} width={w * 0.6} height={h * 0.25} rx={2} fill="white" stroke={stroke} strokeWidth={0.7} />
      {/* Bowl */}
      <ellipse cx={cx} cy={h * 0.6} rx={w * 0.35} ry={h * 0.3} fill="white" stroke={stroke} strokeWidth={0.7} />
    </>
  );
}

function SinkIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const cx = w / 2;
  const cy = h / 2;
  return (
    <>
      {/* Basin */}
      <ellipse cx={cx} cy={cy + h * 0.05} rx={w * 0.35} ry={h * 0.3} fill="white" stroke={stroke} strokeWidth={0.7} />
      {/* Faucet dot */}
      <circle cx={cx} cy={cy - h * 0.2} r={Math.min(w, h) * 0.06} fill={stroke} opacity={0.5} />
    </>
  );
}

function BathtubIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.08;
  return (
    <>
      {/* Outer tub */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={4} fill="white" stroke={stroke} strokeWidth={0.8} />
      {/* Inner tub */}
      <rect x={pad * 2.5} y={pad * 2.5} width={w - pad * 5} height={h - pad * 5} rx={3} fill="none" stroke={stroke} strokeWidth={0.4} opacity={0.4} />
      {/* Drain */}
      <circle cx={w / 2} cy={h - pad * 3} r={Math.min(w, h) * 0.04} fill={stroke} opacity={0.4} />
    </>
  );
}

function ShowerIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.1;
  return (
    <>
      {/* Shower tray */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={2} fill="white" stroke={stroke} strokeWidth={0.7} />
      {/* Shower head (dots pattern) */}
      <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.12} fill="none" stroke={stroke} strokeWidth={0.5} opacity={0.5} />
      {/* Drain */}
      <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.04} fill={stroke} opacity={0.4} />
    </>
  );
}

function TableIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.08;
  return (
    <>
      {/* Table top */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
    </>
  );
}

function ChairIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.12;
  return (
    <>
      {/* Seat */}
      <rect x={pad} y={h * 0.3} width={w - pad * 2} height={h * 0.55} rx={2} fill="white" stroke={stroke} strokeWidth={0.6} />
      {/* Back rest */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h * 0.2} rx={2} fill={stroke} opacity={0.2} />
    </>
  );
}

function DeskIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.06;
  return (
    <>
      {/* Desktop surface */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
      {/* Keyboard area */}
      <rect x={w * 0.2} y={h * 0.45} width={w * 0.6} height={h * 0.2} rx={1} fill={stroke} opacity={0.1} />
    </>
  );
}

function TVStandIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.06;
  return (
    <>
      {/* Stand */}
      <rect x={pad} y={h * 0.4} width={w - pad * 2} height={h * 0.55} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
      {/* TV screen */}
      <rect x={w * 0.1} y={pad} width={w * 0.8} height={h * 0.3} rx={1} fill={stroke} opacity={0.15} />
    </>
  );
}

function WardrobeIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.06;
  return (
    <>
      {/* Outer frame */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={1} fill="white" stroke={stroke} strokeWidth={0.7} />
      {/* Center divider */}
      <line x1={w / 2} y1={pad * 2} x2={w / 2} y2={h - pad * 2} stroke={stroke} strokeWidth={0.5} opacity={0.4} />
      {/* Handles */}
      <circle cx={w / 2 - 2} cy={h / 2} r={1} fill={stroke} opacity={0.5} />
      <circle cx={w / 2 + 2} cy={h / 2} r={1} fill={stroke} opacity={0.5} />
    </>
  );
}

function BookshelfIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.08;
  const innerH = h - pad * 2;
  const shelves = 3;
  return (
    <>
      {/* Frame */}
      <rect x={pad} y={pad} width={w - pad * 2} height={innerH} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} />
      {/* Shelf lines */}
      {Array.from({ length: shelves - 1 }).map((_, i) => {
        const sy = pad + (innerH / shelves) * (i + 1);
        return <line key={i} x1={pad + 1} y1={sy} x2={w - pad - 1} y2={sy} stroke={stroke} strokeWidth={0.4} opacity={0.4} />;
      })}
    </>
  );
}

function RefrigeratorIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.08;
  return (
    <>
      {/* Outer frame */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={2} fill="white" stroke={stroke} strokeWidth={0.7} />
      {/* Divider (freezer/fridge) */}
      <line x1={pad + 1} y1={h * 0.35} x2={w - pad - 1} y2={h * 0.35} stroke={stroke} strokeWidth={0.5} opacity={0.5} />
      {/* Handle */}
      <line x1={w - pad - 3} y1={h * 0.15} x2={w - pad - 3} y2={h * 0.3} stroke={stroke} strokeWidth={0.8} opacity={0.4} />
      <line x1={w - pad - 3} y1={h * 0.42} x2={w - pad - 3} y2={h * 0.65} stroke={stroke} strokeWidth={0.8} opacity={0.4} />
    </>
  );
}

function StoveIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.18;
  return (
    <>
      {/* Burners - 4 circles */}
      <circle cx={cx - r * 1.1} cy={cy - r * 0.9} r={r * 0.7} fill="none" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
      <circle cx={cx + r * 1.1} cy={cy - r * 0.9} r={r * 0.7} fill="none" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
      <circle cx={cx - r * 1.1} cy={cy + r * 0.9} r={r * 0.7} fill="none" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
      <circle cx={cx + r * 1.1} cy={cy + r * 0.9} r={r * 0.7} fill="none" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
    </>
  );
}

function KitchenCounterIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.06;
  return (
    <>
      {/* Counter surface */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} opacity={0.4} />
      {/* Sink basin in counter */}
      <ellipse cx={w * 0.3} cy={h / 2} rx={w * 0.1} ry={h * 0.18} fill="none" stroke={stroke} strokeWidth={0.5} opacity={0.4} />
    </>
  );
}

function WashingMachineIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.28;
  return (
    <>
      {/* Machine body */}
      <rect x={w * 0.08} y={h * 0.08} width={w * 0.84} height={h * 0.84} rx={2} fill="white" stroke={stroke} strokeWidth={0.7} />
      {/* Drum circle */}
      <circle cx={cx} cy={cy + h * 0.05} r={r} fill="none" stroke={stroke} strokeWidth={0.6} opacity={0.5} />
      {/* Control panel line */}
      <line x1={w * 0.15} y1={h * 0.18} x2={w * 0.85} y2={h * 0.18} stroke={stroke} strokeWidth={0.4} opacity={0.3} />
    </>
  );
}

function DresserIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.08;
  const innerH = h - pad * 2;
  const drawers = 3;
  return (
    <>
      {/* Frame */}
      <rect x={pad} y={pad} width={w - pad * 2} height={innerH} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} />
      {/* Drawer lines */}
      {Array.from({ length: drawers - 1 }).map((_, i) => {
        const dy = pad + (innerH / drawers) * (i + 1);
        return <line key={i} x1={pad + 1} y1={dy} x2={w - pad - 1} y2={dy} stroke={stroke} strokeWidth={0.4} opacity={0.4} />;
      })}
      {/* Drawer handles */}
      {Array.from({ length: drawers }).map((_, i) => {
        const dy = pad + (innerH / drawers) * i + innerH / drawers / 2;
        return <circle key={`h${i}`} cx={w / 2} cy={dy} r={1} fill={stroke} opacity={0.4} />;
      })}
    </>
  );
}

function NightstandIcon({ w, h, stroke = "#4B5563" }: IconProps) {
  const pad = w * 0.1;
  return (
    <>
      {/* Frame */}
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={1} fill="white" stroke={stroke} strokeWidth={0.6} />
      {/* Drawer line */}
      <line x1={pad + 1} y1={h / 2} x2={w - pad - 1} y2={h / 2} stroke={stroke} strokeWidth={0.4} opacity={0.4} />
      {/* Handle */}
      <circle cx={w / 2} cy={h * 0.7} r={1} fill={stroke} opacity={0.4} />
    </>
  );
}

/** Lookup of furniture type → icon component */
const iconMap: Record<FurnitureType, React.FC<IconProps>> = {
  bed: BedIcon,
  nightstand: NightstandIcon,
  dresser: DresserIcon,
  desk: DeskIcon,
  chair: ChairIcon,
  sofa: SofaIcon,
  coffee_table: TableIcon,
  dining_table: TableIcon,
  dining_chair: ChairIcon,
  tv_stand: TVStandIcon,
  bookshelf: BookshelfIcon,
  wardrobe: WardrobeIcon,
  toilet: ToiletIcon,
  sink: SinkIcon,
  bathtub: BathtubIcon,
  shower: ShowerIcon,
  kitchen_counter: KitchenCounterIcon,
  refrigerator: RefrigeratorIcon,
  stove: StoveIcon,
  washing_machine: WashingMachineIcon,
};

export default iconMap;
