import type { Room } from "../lib/types";

const SCALE = 10; // 1 foot = 10px

export default function RoomRect({ room }: { room: Room }) {
  const x = room.x * SCALE;
  const y = room.y * SCALE;
  const w = room.width * SCALE;
  const h = room.height * SCALE;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={room.color}
        stroke="#374151"
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={600}
        fill="#1F2937"
      >
        {room.name}
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fill="#6B7280"
      >
        {room.width}&times;{room.height} ft
      </text>
    </g>
  );
}

export { SCALE };
