import type { Annotation } from "../lib/types";
import { SCALE } from "./RoomRect";

function LabelAnnotation({ ann, px, py }: { ann: Annotation; px: number; py: number }) {
  const fontSize = ann.fontSize ?? 10;
  const color = ann.color ?? "#DC2626";
  return (
    <text
      x={px}
      y={py}
      fontSize={fontSize}
      fontWeight={600}
      fill={color}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {ann.text}
    </text>
  );
}

function CalloutAnnotation({ ann, px, py }: { ann: Annotation; px: number; py: number }) {
  const fontSize = ann.fontSize ?? 9;
  const color = ann.color ?? "#DC2626";
  const tx = (ann.targetX ?? 0) * SCALE;
  const ty = (ann.targetY ?? 0) * SCALE;

  // Arrow head
  const dx = tx - px;
  const dy = ty - py;
  const len = Math.sqrt(dx * dx + dy * dy);
  const arrowLen = 5;
  if (len === 0) return <LabelAnnotation ann={ann} px={px} py={py} />;

  const ux = dx / len;
  const uy = dy / len;
  const ax1 = tx - ux * arrowLen - uy * arrowLen * 0.4;
  const ay1 = ty - uy * arrowLen + ux * arrowLen * 0.4;
  const ax2 = tx - ux * arrowLen + uy * arrowLen * 0.4;
  const ay2 = ty - uy * arrowLen - ux * arrowLen * 0.4;

  return (
    <g>
      <line x1={px} y1={py} x2={tx} y2={ty} stroke={color} strokeWidth={0.8} />
      <polygon points={`${tx},${ty} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
      <text
        x={px}
        y={py - fontSize * 0.7}
        fontSize={fontSize}
        fontWeight={600}
        fill={color}
        textAnchor="middle"
      >
        {ann.text}
      </text>
    </g>
  );
}

function DimensionAnnotation({ ann, px, py }: { ann: Annotation; px: number; py: number }) {
  const fontSize = ann.fontSize ?? 8;
  const color = ann.color ?? "#DC2626";
  const tx = (ann.targetX ?? 0) * SCALE;
  const ty = (ann.targetY ?? 0) * SCALE;

  const isHorizontal = Math.abs(ty - py) < Math.abs(tx - px);
  const tickLen = 4;

  const midX = (px + tx) / 2;
  const midY = (py + ty) / 2;

  return (
    <g>
      {/* Dimension line */}
      <line x1={px} y1={py} x2={tx} y2={ty} stroke={color} strokeWidth={0.8} />
      {/* Tick marks */}
      {isHorizontal ? (
        <>
          <line x1={px} y1={py - tickLen} x2={px} y2={py + tickLen} stroke={color} strokeWidth={0.8} />
          <line x1={tx} y1={ty - tickLen} x2={tx} y2={ty + tickLen} stroke={color} strokeWidth={0.8} />
        </>
      ) : (
        <>
          <line x1={px - tickLen} y1={py} x2={px + tickLen} y2={py} stroke={color} strokeWidth={0.8} />
          <line x1={tx - tickLen} y1={ty} x2={tx + tickLen} y2={ty} stroke={color} strokeWidth={0.8} />
        </>
      )}
      {/* Text */}
      <rect
        x={midX - ann.text.length * fontSize * 0.3}
        y={midY - fontSize * 0.7}
        width={ann.text.length * fontSize * 0.6}
        height={fontSize * 1.4}
        fill="white"
        opacity={0.9}
      />
      <text
        x={midX}
        y={midY + 1}
        fontSize={fontSize}
        fontWeight={500}
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {ann.text}
      </text>
    </g>
  );
}

function NoteAnnotation({ ann, px, py }: { ann: Annotation; px: number; py: number }) {
  const fontSize = ann.fontSize ?? 8;
  const color = ann.color ?? "#DC2626";
  const padding = 4;
  const textWidth = ann.text.length * fontSize * 0.55;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 2;

  return (
    <g>
      <rect
        x={px - boxWidth / 2}
        y={py - boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        rx={3}
        fill="white"
        stroke={color}
        strokeWidth={0.8}
        opacity={0.95}
      />
      <text
        x={px}
        y={py + 1}
        fontSize={fontSize}
        fontWeight={500}
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {ann.text}
      </text>
    </g>
  );
}

export default function AnnotationOverlay({ annotations }: { annotations: Annotation[] }) {
  return (
    <g>
      {annotations.map((ann) => {
        const px = ann.x * SCALE;
        const py = ann.y * SCALE;

        switch (ann.type) {
          case "label":
            return <LabelAnnotation key={ann.id} ann={ann} px={px} py={py} />;
          case "callout":
            return <CalloutAnnotation key={ann.id} ann={ann} px={px} py={py} />;
          case "dimension":
            return <DimensionAnnotation key={ann.id} ann={ann} px={px} py={py} />;
          case "note":
            return <NoteAnnotation key={ann.id} ann={ann} px={px} py={py} />;
          default:
            return <LabelAnnotation key={ann.id} ann={ann} px={px} py={py} />;
        }
      })}
    </g>
  );
}
