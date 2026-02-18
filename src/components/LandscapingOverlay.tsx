import type { LandscapeElement } from "../lib/types";
import { landscapeColors } from "../lib/colors";
import { SCALE } from "./RoomRect";

function TreeElement({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.5} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.3} fill={color} opacity={0.8} />
    </g>
  );
}

function ShrubElement({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} opacity={0.5} stroke={color} strokeWidth={0.8} />
  );
}

function PoolElement({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.1} fill={color} opacity={0.4} stroke={color} strokeWidth={1.5} />
      {/* Wave lines */}
      {Array.from({ length: 3 }, (_, i) => {
        const ly = y + (h / 4) * (i + 1);
        return (
          <path
            key={i}
            d={`M ${x + 3} ${ly} Q ${x + w * 0.25} ${ly - 2}, ${x + w * 0.5} ${ly} Q ${x + w * 0.75} ${ly + 2}, ${x + w - 3} ${ly}`}
            fill="none"
            stroke="white"
            strokeWidth={0.8}
            opacity={0.6}
          />
        );
      })}
    </g>
  );
}

function FountainElement({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.4} stroke={color} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={color} strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill={color} opacity={0.7} />
    </g>
  );
}

function GenericLandscape({ x, y, w, h, color, label }: { x: number; y: number; w: number; h: number; color: string; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} fill={color} opacity={0.35} stroke={color} strokeWidth={1} />
      <text
        x={x + w / 2}
        y={y + h / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(8, w / (label.length * 0.6))}
        fontWeight={500}
        fill="#374151"
        opacity={0.8}
      >
        {label}
      </text>
    </g>
  );
}

export default function LandscapingOverlay({ elements }: { elements: LandscapeElement[] }) {
  return (
    <g>
      {elements.map((e) => {
        const px = e.x * SCALE;
        const py = e.y * SCALE;
        const pw = e.width * SCALE;
        const ph = e.height * SCALE;
        const color = landscapeColors[e.type] ?? "#86EFAC";

        switch (e.type) {
          case "tree":
            return <TreeElement key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "shrub":
            return <ShrubElement key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "pool":
            return <PoolElement key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "fountain":
            return <FountainElement key={e.id} x={px} y={py} w={pw} h={ph} color={color} />;
          case "garden_bed":
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="Garden" />;
          case "lawn":
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="Lawn" />;
          case "driveway":
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="Driveway" />;
          case "walkway":
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="" />;
          case "patio":
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="Patio" />;
          case "deck":
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label="Deck" />;
          case "fence":
            return (
              <rect key={e.id} x={px} y={py} width={pw} height={ph} fill={color} opacity={0.6} stroke={color} strokeWidth={1} />
            );
          default:
            return <GenericLandscape key={e.id} x={px} y={py} w={pw} h={ph} color={color} label={e.name} />;
        }
      })}
    </g>
  );
}
