/**
 * Deterministic room placement engine.
 *
 * Takes a RoomPlan (rooms with zones, areas, adjacencies) and computes
 * exact (x, y, width, height) coordinates that tile the plot perfectly.
 *
 * Algorithm: Strip-based tiling with adjacency-aware ordering.
 * 1. Normalize entry edge (always compute as if entry is at top)
 * 2. Group rooms by zone, stack zone bands front-to-back
 * 3. Order rooms within bands using adjacency graph DFS
 * 4. Lay out rooms proportionally within each band
 * 5. Split into sub-rows for bands with many rooms
 * 6. Round to integers and fix gaps
 */

import type { PlannedRoom, RoomPlan, Room, Plot, ZoneType } from "./types";
import { roomColors } from "./colors";

// ── Public types ─────────────────────────────────────────

export interface PlacementResult {
  success: boolean;
  rooms: Room[];
  warnings: string[];
}

// ── Internal types ───────────────────────────────────────

interface ZoneGroup {
  zone: ZoneType;
  rooms: PlannedRoom[];
}

interface BandAlloc {
  y: number;
  height: number;
  rooms: PlannedRoom[];
}

type AdjMap = Map<string, Set<string>>;

// ── Main entry point ─────────────────────────────────────

export function computeRoomPlacement(plan: RoomPlan): PlacementResult {
  if (plan.rooms.length === 0) {
    return { success: true, rooms: [], warnings: [] };
  }

  if (plan.rooms.length === 1) {
    const r = plan.rooms[0];
    return {
      success: true,
      rooms: [
        {
          id: r.id,
          name: r.name,
          type: r.type,
          x: 0,
          y: 0,
          width: plan.plot.width,
          height: plan.plot.height,
          color: roomColors[r.type] ?? roomColors.other,
        },
      ],
      warnings: [],
    };
  }

  // Normalize: always lay out as if entry is at top.
  // For left/right entry, transpose the coordinate system.
  const transpose =
    plan.entryEdge === "left" || plan.entryEdge === "right";
  const reverseZones =
    plan.entryEdge === "bottom" || plan.entryEdge === "right";

  const normW = transpose ? plan.plot.height : plan.plot.width;
  const normH = transpose ? plan.plot.width : plan.plot.height;

  // Swap widthRange/heightRange when transposed
  const normRooms: PlannedRoom[] = transpose
    ? plan.rooms.map((r) => ({
        ...r,
        widthRange: r.heightRange,
        heightRange: r.widthRange,
      }))
    : plan.rooms;

  // Group rooms by zone and determine band order
  const zoneGroups = groupByZone(normRooms, reverseZones);

  // Build adjacency lookup (required only, for room ordering)
  const adjRequired = buildAdjMap(
    plan.adjacencies.filter((a) => a.strength === "required")
  );

  // Allocate zone bands (y, height for each group)
  const bands = allocateBands(zoneGroups, normH);

  // Lay out rooms within each band
  const placed: Room[] = [];
  for (const band of bands) {
    const ordered = orderByAdjacency(
      band.rooms,
      adjRequired,
      plan.entryRoomId
    );
    const bandRooms = layoutBand(ordered, band.y, band.height, normW);
    placed.push(...bandRooms);
  }

  // Denormalize (transpose back if needed)
  const final = transpose
    ? placed.map((r) => ({
        ...r,
        x: r.y,
        y: r.x,
        width: r.height,
        height: r.width,
      }))
    : placed;

  // Round to integers and ensure perfect tiling
  snapToIntegers(final, plan.plot);

  return { success: true, rooms: final, warnings: [] };
}

// ── Zone grouping ────────────────────────────────────────

function groupByZone(
  rooms: PlannedRoom[],
  reverse: boolean
): ZoneGroup[] {
  const pub = rooms.filter((r) => r.zone === "public");
  const svc = rooms.filter((r) => r.zone === "service");
  const prv = rooms.filter((r) => r.zone === "private");

  // Order: public near entry (top), service middle, private far (bottom)
  const groups: ZoneGroup[] = [];
  if (pub.length > 0) groups.push({ zone: "public", rooms: pub });
  if (svc.length > 0) groups.push({ zone: "service", rooms: svc });
  if (prv.length > 0) groups.push({ zone: "private", rooms: prv });

  // Fallback: all rooms in one group
  if (groups.length === 0) {
    groups.push({ zone: "public", rooms: [...rooms] });
  }

  if (reverse) groups.reverse();
  return groups;
}

// ── Band allocation ──────────────────────────────────────

function allocateBands(
  groups: ZoneGroup[],
  plotH: number
): BandAlloc[] {
  const totalArea = groups.reduce(
    (sum, g) => sum + g.rooms.reduce((s, r) => s + r.targetArea, 0),
    0
  );

  const bands: BandAlloc[] = [];
  let y = 0;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const groupArea = g.rooms.reduce((s, r) => s + r.targetArea, 0);

    let height: number;
    if (i === groups.length - 1) {
      height = plotH - y;
    } else {
      height =
        totalArea > 0
          ? Math.round((plotH * groupArea) / totalArea)
          : Math.round(plotH / groups.length);
      height = Math.max(height, bandMinHeight(g.rooms));
    }

    // Ensure last band also respects minimum height
    if (i === groups.length - 1 && height < bandMinHeight(g.rooms)) {
      const deficit = bandMinHeight(g.rooms) - height;
      if (bands.length > 0) {
        const prev = bands[bands.length - 1];
        const canGive = prev.height - bandMinHeight(prev.rooms);
        const give = Math.min(deficit, Math.max(0, canGive));
        prev.height -= give;
        y -= give;
        height = plotH - y;
      }
    }

    bands.push({ y, height, rooms: g.rooms });
    y += height;
  }

  return bands;
}

/** Minimum band height: the largest min dimension among its rooms. */
function bandMinHeight(rooms: PlannedRoom[]): number {
  if (rooms.length === 0) return 5;
  return Math.max(...rooms.map((r) => (r.type === "hallway" ? 3 : 5)));
}

// ── Adjacency graph ──────────────────────────────────────

function buildAdjMap(
  adjs: { roomId: string; adjacentTo: string }[]
): AdjMap {
  const map: AdjMap = new Map();
  for (const a of adjs) {
    if (!map.has(a.roomId)) map.set(a.roomId, new Set());
    if (!map.has(a.adjacentTo)) map.set(a.adjacentTo, new Set());
    map.get(a.roomId)!.add(a.adjacentTo);
    map.get(a.adjacentTo)!.add(a.roomId);
  }
  return map;
}

// ── Room ordering by adjacency DFS ───────────────────────

function orderByAdjacency(
  rooms: PlannedRoom[],
  adjRequired: AdjMap,
  entryRoomId: string
): PlannedRoom[] {
  if (rooms.length <= 1) return rooms;

  const roomIds = new Set(rooms.map((r) => r.id));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Build subgraph restricted to rooms in this band
  const subgraph: AdjMap = new Map();
  for (const id of roomIds) {
    const neighbors = adjRequired.get(id);
    if (neighbors) {
      const filtered = new Set(
        [...neighbors].filter((n) => roomIds.has(n))
      );
      if (filtered.size > 0) subgraph.set(id, filtered);
    }
  }

  // DFS to build a linear ordering, starting from entry room if present
  const visited = new Set<string>();
  const result: PlannedRoom[] = [];

  const startOrder: string[] = [];
  if (roomIds.has(entryRoomId)) startOrder.push(entryRoomId);
  for (const r of rooms) {
    if (r.id !== entryRoomId) startOrder.push(r.id);
  }

  for (const startId of startOrder) {
    if (visited.has(startId)) continue;

    const dfs = (id: string) => {
      visited.add(id);
      const room = roomMap.get(id);
      if (room) result.push(room);

      const neighbors = subgraph.get(id) ?? new Set();
      // Visit unvisited neighbors, leaves first for better chain ordering
      const unvisited = [...neighbors]
        .filter((n) => !visited.has(n))
        .sort(
          (a, b) =>
            (subgraph.get(a)?.size ?? 0) - (subgraph.get(b)?.size ?? 0)
        );
      for (const n of unvisited) {
        dfs(n);
      }
    };

    dfs(startId);
  }

  return result;
}

// ── Band layout (with sub-row splitting) ─────────────────

function layoutBand(
  rooms: PlannedRoom[],
  bandY: number,
  bandH: number,
  plotW: number
): Room[] {
  if (rooms.length === 0) return [];

  // Determine how many sub-rows we need
  const maxMinDim = Math.max(
    ...rooms.map((r) => (r.type === "hallway" ? 3 : 5))
  );
  const numSubRows = Math.max(
    1,
    Math.ceil((rooms.length * maxMinDim) / plotW)
  );

  if (numSubRows <= 1) {
    return layoutSingleRow(rooms, bandY, bandH, plotW);
  }

  // Also check if band is tall enough for multiple sub-rows
  if (bandH < maxMinDim * numSubRows) {
    // Band too short for sub-rows, just do a single row
    return layoutSingleRow(rooms, bandY, bandH, plotW);
  }

  // Split rooms into sub-rows
  const result: Room[] = [];
  const roomsPerRow = Math.ceil(rooms.length / numSubRows);
  const totalArea = rooms.reduce((s, r) => s + r.targetArea, 0) || rooms.length;
  let subY = bandY;

  for (let row = 0; row < numSubRows; row++) {
    const start = row * roomsPerRow;
    const end = Math.min(start + roomsPerRow, rooms.length);
    const subRooms = rooms.slice(start, end);
    if (subRooms.length === 0) break;

    const subArea =
      subRooms.reduce((s, r) => s + r.targetArea, 0) || subRooms.length;

    let subH: number;
    if (row === numSubRows - 1) {
      subH = bandY + bandH - subY;
    } else {
      subH = Math.round((bandH * subArea) / totalArea);
      subH = Math.max(subH, bandMinHeight(subRooms));
    }

    result.push(...layoutSingleRow(subRooms, subY, subH, plotW));
    subY += subH;
  }

  return result;
}

// ── Single row layout ────────────────────────────────────

function layoutSingleRow(
  rooms: PlannedRoom[],
  y: number,
  height: number,
  totalWidth: number
): Room[] {
  const n = rooms.length;
  if (n === 0) return [];

  // Step 1: Determine minimum widths
  const minWidths = rooms.map((r) => (r.type === "hallway" ? 3 : 5));
  const totalMin = minWidths.reduce((s, w) => s + w, 0);

  // Degenerate case: minimums exceed or equal total width
  if (totalMin >= totalWidth) {
    const result: Room[] = [];
    let x = 0;
    for (let i = 0; i < n; i++) {
      const w = i === n - 1 ? totalWidth - x : Math.round(totalWidth / n);
      result.push(makeRoom(rooms[i], x, y, Math.max(w, 1), height));
      x += Math.max(w, 1);
    }
    return result;
  }

  // Step 2: Distribute remaining space proportionally by target area
  const remaining = totalWidth - totalMin;
  const totalArea =
    rooms.reduce((s, r) => s + r.targetArea, 0) || rooms.length;

  // Use largest-remainder method for fair integer distribution
  const extras = rooms.map(
    (r) => (remaining * (r.targetArea || 1)) / totalArea
  );
  const floored = extras.map((e) => Math.floor(e));
  let leftover = remaining - floored.reduce((s, f) => s + f, 0);

  // Distribute leftover to rooms with largest fractional parts
  const fracs = extras
    .map((e, i) => ({ i, frac: e - floored[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < leftover && j < fracs.length; j++) {
    floored[fracs[j].i]++;
  }

  const widths = rooms.map((_, i) => minWidths[i] + floored[i]);

  // Step 3: Create rooms
  const result: Room[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    // Last room absorbs any remaining width to guarantee perfect tiling
    const w = i === n - 1 ? totalWidth - x : widths[i];
    result.push(makeRoom(rooms[i], x, y, w, height));
    x += w;
  }

  return result;
}

function makeRoom(
  r: PlannedRoom,
  x: number,
  y: number,
  width: number,
  height: number
): Room {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    x,
    y,
    width,
    height,
    color: roomColors[r.type] ?? roomColors.other,
  };
}

// ── Integer snapping and gap fixing ──────────────────────

function snapToIntegers(rooms: Room[], plot: Plot): void {
  // Round all coordinates
  for (const r of rooms) {
    r.x = Math.round(r.x);
    r.y = Math.round(r.y);
    r.width = Math.round(r.width);
    r.height = Math.round(r.height);
  }

  // Clamp to plot bounds
  for (const r of rooms) {
    if (r.x + r.width > plot.width) r.width = plot.width - r.x;
    if (r.y + r.height > plot.height) r.height = plot.height - r.y;
    if (r.width < 1) r.width = 1;
    if (r.height < 1) r.height = 1;
  }

  // Group rooms by row (same y value)
  const rowMap = new Map<number, Room[]>();
  for (const r of rooms) {
    if (!rowMap.has(r.y)) rowMap.set(r.y, []);
    rowMap.get(r.y)!.push(r);
  }

  // Fix horizontal gaps/overlaps within each row
  for (const [, rowRooms] of rowMap) {
    rowRooms.sort((a, b) => a.x - b.x);

    for (let i = 0; i < rowRooms.length - 1; i++) {
      const rightEdge = rowRooms[i].x + rowRooms[i].width;
      const nextX = rowRooms[i + 1].x;
      if (rightEdge !== nextX) {
        // Adjust current room to close gap or fix overlap
        rowRooms[i].width = nextX - rowRooms[i].x;
      }
    }

    // Last room reaches plot width
    const last = rowRooms[rowRooms.length - 1];
    last.width = plot.width - last.x;
  }

  // Fix vertical gaps: ensure row heights tile the plot
  const rowYs = [...rowMap.keys()].sort((a, b) => a - b);

  for (let i = 0; i < rowYs.length; i++) {
    const rowRooms = rowMap.get(rowYs[i])!;
    const expectedH =
      i < rowYs.length - 1
        ? rowYs[i + 1] - rowYs[i]
        : plot.height - rowYs[i];

    for (const r of rowRooms) {
      r.height = expectedH;
    }
  }
}
