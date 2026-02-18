import type { Room } from "../lib/types";

const SCALE = 10; // 1 foot = 10px

/** Minimum pixel area to show room labels */
const MIN_LABEL_AREA = 2000;
const MIN_DIM_AREA = 3500;

export default function RoomRect({ room }: { room: Room }) {
  const x = room.x * SCALE;
  const y = room.y * SCALE;
  const w = room.width * SCALE;
  const h = room.height * SCALE;
  const area = w * h;
  const isWetRoom = room.type === "bathroom" || room.type === "kitchen";

  const showName = area >= MIN_LABEL_AREA;
  const showDims = area >= MIN_DIM_AREA;

  // Dynamic font sizing for small rooms
  const nameFontSize = Math.min(11, w / (room.name.length * 0.65), h * 0.15);
  const nameVisible = showName && nameFontSize >= 6;

  return (
    <g>
      {/* Subtle room fill */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={room.color}
        opacity={0.25}
      />

      {/* Diagonal hatching for wet rooms */}
      {isWetRoom && (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="url(#hatch-wet)"
          opacity={0.3}
        />
      )}

      {/* Room name — centered, uppercase */}
      {nameVisible && (
        <text
          x={x + w / 2}
          y={y + h / 2 - (showDims ? 6 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={nameFontSize}
          fontWeight={600}
          fill="#1F2937"
          opacity={0.85}
          style={{ letterSpacing: "0.5px" }}
        >
          {room.name.toUpperCase()}
        </text>
      )}

      {/* Area in sqft */}
      {showDims && (
        <>
          <text
            x={x + w / 2}
            y={y + h / 2 + 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fill="#6B7280"
            opacity={0.75}
          >
            {room.width * room.height} sq ft
          </text>
          <text
            x={x + w / 2}
            y={y + h / 2 + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill="#9CA3AF"
            opacity={0.65}
          >
            {room.width}&apos; &times; {room.height}&apos;
          </text>
        </>
      )}
    </g>
  );
}

export { SCALE };
