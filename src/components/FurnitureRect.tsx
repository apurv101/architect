import type { FurnitureItem } from "../lib/types";
import { furnitureColors } from "../lib/colors";
import { SCALE } from "./RoomRect";
import iconMap from "./FurnitureIcons";

/** Minimum pixel area to show a text label inside the furniture */
const MIN_LABEL_AREA = 1200; // ~35×35px
/** Minimum pixel width to fit any text */
const MIN_LABEL_WIDTH = 28;

/** Friendly display name — shorter than item.name for tight spaces */
const shortNames: Record<string, string> = {
  kitchen_counter: "Counter",
  coffee_table: "Coffee Tbl",
  dining_table: "Table",
  dining_chair: "Chair",
  washing_machine: "Washer",
  refrigerator: "Fridge",
  nightstand: "NS",
  bookshelf: "Shelf",
  tv_stand: "TV",
};

export default function FurnitureRect({ item }: { item: FurnitureItem }) {
  const px = item.x * SCALE;
  const py = item.y * SCALE;
  const pw = item.width * SCALE;
  const ph = item.height * SCALE;

  const cx = px + pw / 2;
  const cy = py + ph / 2;

  const fill = furnitureColors[item.type] ?? "#E5E7EB";

  // Determine effective dimensions after rotation for label logic
  const rotated = item.rotation === 90 || item.rotation === 270;
  const effectiveW = rotated ? ph : pw;
  const effectiveH = rotated ? pw : ph;
  const area = effectiveW * effectiveH;

  const showLabel = area >= MIN_LABEL_AREA && effectiveW >= MIN_LABEL_WIDTH;
  const label = shortNames[item.type] ?? item.name;

  // Dynamically size label font based on available space
  const maxFontSize = 9;
  const fontSize = Math.min(maxFontSize, effectiveW / (label.length * 0.55), effectiveH * 0.25);
  const labelVisible = showLabel && fontSize >= 5;

  // Get the icon renderer for this furniture type
  const IconComponent = iconMap[item.type];

  return (
    <g transform={item.rotation ? `rotate(${item.rotation}, ${cx}, ${cy})` : undefined}>
      {/* Tooltip on hover */}
      <title>{item.name} ({item.width}×{item.height} ft)</title>

      {/* Background fill */}
      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        fill={fill}
        stroke="#6B7280"
        strokeWidth={0.8}
        rx={1.5}
        opacity={0.9}
      />

      {/* SVG icon shape */}
      {IconComponent && (
        <g transform={`translate(${px}, ${py})`}>
          <IconComponent w={pw} h={ph} />
        </g>
      )}

      {/* Text label — only if there's enough space */}
      {labelVisible && (
        <text
          x={cx}
          y={cy + (ph > 25 ? ph * 0.35 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fontWeight={500}
          fill="#1F2937"
          opacity={0.8}
        >
          {label}
        </text>
      )}
    </g>
  );
}
