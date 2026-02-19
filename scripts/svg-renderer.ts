/**
 * Standalone SVG renderer for FloorPlan objects.
 * Replicates the app's React SVG rendering without React dependencies.
 */
import type { FloorPlan, Room, Door, Window } from "../src/lib/types";

const SCALE = 10; // 1 foot = 10 pixels
const PADDING = 60;
const WALL_COLOR = "#1F2937";
const EXT_WALL_PX = 5;
const INT_WALL_PX = 3;

// ── Helpers ──────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Edge / Wall logic ────────────────────────────────────

interface Edge {
  orientation: "horizontal" | "vertical";
  fixed: number;   // the coordinate that's shared (y for horizontal, x for vertical)
  start: number;   // start along the axis
  end: number;     // end along the axis
  isExterior: boolean;
}

function collectEdges(rooms: Room[], plotW: number, plotH: number): Edge[] {
  const raw: Edge[] = [];
  for (const r of rooms) {
    const x1 = r.x * SCALE, y1 = r.y * SCALE;
    const x2 = (r.x + r.width) * SCALE, y2 = (r.y + r.height) * SCALE;
    raw.push({ orientation: "horizontal", fixed: y1, start: x1, end: x2, isExterior: false });
    raw.push({ orientation: "horizontal", fixed: y2, start: x1, end: x2, isExterior: false });
    raw.push({ orientation: "vertical", fixed: x1, start: y1, end: y2, isExterior: false });
    raw.push({ orientation: "vertical", fixed: x2, start: y1, end: y2, isExterior: false });
  }

  // Mark exterior
  const pw = plotW * SCALE, ph = plotH * SCALE;
  for (const e of raw) {
    if (e.orientation === "horizontal" && (e.fixed === 0 || e.fixed === ph)) e.isExterior = true;
    if (e.orientation === "vertical" && (e.fixed === 0 || e.fixed === pw)) e.isExterior = true;
  }

  return mergeEdges(raw);
}

function mergeEdges(edges: Edge[]): Edge[] {
  const groups = new Map<string, Edge[]>();
  for (const e of edges) {
    const key = `${e.orientation}:${e.fixed}:${e.isExterior}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  const merged: Edge[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.start - b.start);
    let cur = { ...list[0] };
    for (let i = 1; i < list.length; i++) {
      if (list[i].start <= cur.end + 0.5) {
        cur.end = Math.max(cur.end, list[i].end);
      } else {
        merged.push(cur);
        cur = { ...list[i] };
      }
    }
    merged.push(cur);
  }
  return merged;
}

interface Opening {
  orientation: "horizontal" | "vertical";
  fixed: number;
  start: number;
  end: number;
}

function collectOpenings(doors: Door[], windows: Window[]): Opening[] {
  const ops: Opening[] = [];
  for (const d of doors) {
    ops.push({
      orientation: d.orientation,
      fixed: d.orientation === "horizontal" ? d.y * SCALE : d.x * SCALE,
      start: d.orientation === "horizontal" ? d.x * SCALE : d.y * SCALE,
      end: d.orientation === "horizontal" ? (d.x + d.width) * SCALE : (d.y + d.width) * SCALE,
    });
  }
  for (const w of windows) {
    ops.push({
      orientation: w.orientation,
      fixed: w.orientation === "horizontal" ? w.y * SCALE : w.x * SCALE,
      start: w.orientation === "horizontal" ? w.x * SCALE : w.y * SCALE,
      end: w.orientation === "horizontal" ? (w.x + w.width) * SCALE : (w.y + w.width) * SCALE,
    });
  }
  return ops;
}

function splitEdgeAtOpenings(edge: Edge, openings: Opening[]): Edge[] {
  const matching = openings.filter(
    (o) => o.orientation === edge.orientation && Math.abs(o.fixed - edge.fixed) < 1
  );
  if (matching.length === 0) return [edge];

  matching.sort((a, b) => a.start - b.start);
  const segments: Edge[] = [];
  let cursor = edge.start;
  for (const op of matching) {
    if (op.start > cursor + 0.5) {
      segments.push({ ...edge, start: cursor, end: op.start });
    }
    cursor = Math.max(cursor, op.end);
  }
  if (cursor < edge.end - 0.5) {
    segments.push({ ...edge, start: cursor, end: edge.end });
  }
  return segments;
}

// ── Render functions ─────────────────────────────────────

function renderGrid(pw: number, ph: number): string {
  return `<defs>
    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="none" stroke="#E5E7EB" stroke-width="0.5"/>
    </pattern>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="${pw}" height="${ph}" fill="url(#grid)"/>`;
}

function renderRooms(rooms: Room[]): string {
  let svg = "";
  for (const r of rooms) {
    const x = r.x * SCALE, y = r.y * SCALE;
    const w = r.width * SCALE, h = r.height * SCALE;
    const area = r.width * r.height;

    // Fill
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${r.color}" opacity="0.25"/>`;

    // Wet room hatching
    if (r.type === "bathroom" || r.type === "kitchen") {
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hatch)" opacity="0.3"/>`;
    }

    // Labels
    if (w * h >= 2000) {
      const nameLen = r.name.length;
      const fontSize = Math.min(11, w / (nameLen * 0.65), h * 0.15);
      if (fontSize >= 6) {
        const cx = x + w / 2, cy = y + h / 2;
        svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="${fontSize.toFixed(1)}px" font-weight="600" fill="#1F2937" font-family="sans-serif">${esc(r.name.toUpperCase())}</text>`;
        if (w * h >= 3500) {
          svg += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="7px" fill="#6B7280" font-family="sans-serif">${r.width}×${r.height}</text>`;
          svg += `<text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="8px" fill="#6B7280" font-family="sans-serif">${area} sq ft</text>`;
        }
      }
    }
  }
  return svg;
}

function renderWalls(rooms: Room[], doors: Door[], windows: Window[], plotW: number, plotH: number): string {
  const edges = collectEdges(rooms, plotW, plotH);
  const openings = collectOpenings(doors, windows ?? []);

  let svg = "";
  for (const edge of edges) {
    const segments = splitEdgeAtOpenings(edge, openings);
    const thickness = edge.isExterior ? EXT_WALL_PX : INT_WALL_PX;
    const half = thickness / 2;

    for (const seg of segments) {
      if (seg.end - seg.start < 1) continue;
      if (edge.orientation === "horizontal") {
        svg += `<rect x="${seg.start}" y="${seg.fixed - half}" width="${seg.end - seg.start}" height="${thickness}" fill="${WALL_COLOR}"/>`;
      } else {
        svg += `<rect x="${seg.fixed - half}" y="${seg.start}" width="${thickness}" height="${seg.end - seg.start}" fill="${WALL_COLOR}"/>`;
      }
    }
  }
  return svg;
}

function renderDoors(doors: Door[], rooms: Room[]): string {
  let svg = "";
  for (const d of doors) {
    const x = d.x * SCALE, y = d.y * SCALE;
    const w = d.width * SCALE;

    // Determine swing direction
    let swingInto: Room | undefined;
    if (d.toRoomId === null) {
      swingInto = rooms.find((r) => r.id === d.fromRoomId);
    } else {
      const dir = d.swingDirection ?? "inward";
      swingInto = rooms.find((r) => r.id === (dir === "inward" ? d.fromRoomId : d.toRoomId));
    }

    if (d.orientation === "horizontal") {
      const swingDown = swingInto ? (swingInto.y * SCALE + swingInto.height * SCALE / 2) > y : true;
      const endY = swingDown ? y + w : y - w;
      // Leaf line
      svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${endY}" stroke="${WALL_COLOR}" stroke-width="1.2"/>`;
      // Swing arc
      const sweep = swingDown ? 1 : 0;
      svg += `<path d="M${x},${endY} A${w},${w} 0 0,${sweep} ${x + w},${y}" fill="none" stroke="${WALL_COLOR}" stroke-width="0.7" stroke-dasharray="2,1.5"/>`;
    } else {
      const swingRight = swingInto ? (swingInto.x * SCALE + swingInto.width * SCALE / 2) > x : true;
      const endX = swingRight ? x + w : x - w;
      // Leaf line
      svg += `<line x1="${x}" y1="${y}" x2="${endX}" y2="${y}" stroke="${WALL_COLOR}" stroke-width="1.2"/>`;
      // Swing arc
      const sweep = swingRight ? 0 : 1;
      svg += `<path d="M${endX},${y} A${w},${w} 0 0,${sweep} ${x},${y + w}" fill="none" stroke="${WALL_COLOR}" stroke-width="0.7" stroke-dasharray="2,1.5"/>`;
    }
  }
  return svg;
}

function renderWindows(windows: Window[]): string {
  const GAP = 2;
  let svg = "";
  for (const w of windows) {
    const x = w.x * SCALE, y = w.y * SCALE;
    const ww = w.width * SCALE;

    if (w.orientation === "horizontal") {
      // Clear wall background
      svg += `<rect x="${x}" y="${y - 3}" width="${ww}" height="6" fill="white"/>`;
      // Parallel lines
      svg += `<line x1="${x}" y1="${y - GAP}" x2="${x + ww}" y2="${y - GAP}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
      svg += `<line x1="${x}" y1="${y + GAP}" x2="${x + ww}" y2="${y + GAP}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
      // End caps
      svg += `<line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
      svg += `<line x1="${x + ww}" y1="${y - 3}" x2="${x + ww}" y2="${y + 3}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
    } else {
      svg += `<rect x="${x - 3}" y="${y}" width="6" height="${ww}" fill="white"/>`;
      svg += `<line x1="${x - GAP}" y1="${y}" x2="${x - GAP}" y2="${y + ww}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
      svg += `<line x1="${x + GAP}" y1="${y}" x2="${x + GAP}" y2="${y + ww}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
      svg += `<line x1="${x - 3}" y1="${y}" x2="${x + 3}" y2="${y}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
      svg += `<line x1="${x - 3}" y1="${y + ww}" x2="${x + 3}" y2="${y + ww}" stroke="${WALL_COLOR}" stroke-width="0.8"/>`;
    }
  }
  return svg;
}

// ── Main export ──────────────────────────────────────────

export function renderFloorPlanSVG(fp: FloorPlan): string {
  const pw = fp.plot.width * SCALE;
  const ph = fp.plot.height * SCALE;
  const svgW = pw + PADDING * 2;
  const svgH = ph + PADDING * 2;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="background:white">`);
  parts.push(`<g transform="translate(${PADDING},${PADDING})">`);

  // Grid + defs
  parts.push(renderGrid(pw, ph));

  // Rooms
  parts.push(renderRooms(fp.rooms));

  // Walls (with openings for doors/windows)
  parts.push(renderWalls(fp.rooms, fp.doors, fp.windows ?? [], fp.plot.width, fp.plot.height));

  // Doors
  parts.push(renderDoors(fp.doors, fp.rooms));

  // Windows
  if (fp.windows) {
    parts.push(renderWindows(fp.windows));
  }

  // Title
  parts.push(`</g>`);
  parts.push(`<text x="${svgW / 2}" y="${svgH - 15}" text-anchor="middle" font-size="11px" fill="#6B7280" font-family="sans-serif">${fp.plot.width}ft × ${fp.plot.height}ft — ${fp.plot.area} sq ft</text>`);

  parts.push(`</svg>`);
  return parts.join("\n");
}
