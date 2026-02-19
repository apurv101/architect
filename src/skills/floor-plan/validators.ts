import type { Plot, Room, RoomPlan, SiteAnalysis } from "../../lib/types";
import type { ValidationError } from "../../lib/validation";
import { roomsOverlap, computeOverlapArea, roomsShareWall } from "../../lib/validation";

// ---- Opposite edge map for spatial reasoning ----

const OPPOSITE_EDGES: Record<string, string> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

// ---- Site analysis validation ----

export function validateSiteAnalysis(analysis: SiteAnalysis): ValidationError[] {
  const errors: ValidationError[] = [];
  const roomIds = new Set(analysis.rooms.map((r) => r.id));

  // 1. At least one zone allocation
  if (analysis.zones.length === 0) {
    errors.push({
      severity: "error",
      message: "Site analysis must have at least one zone allocation.",
    });
    return errors;
  }

  // 2. Every room must appear in exactly one zone
  const assignedRooms = new Map<string, string>(); // roomId -> zone
  for (const zone of analysis.zones) {
    for (const roomId of zone.rooms) {
      if (!roomIds.has(roomId)) {
        errors.push({
          severity: "error",
          message: `Zone "${zone.zone}" references unknown room ID "${roomId}".`,
        });
      } else if (assignedRooms.has(roomId)) {
        errors.push({
          severity: "error",
          message: `Room "${roomId}" is assigned to multiple zones: "${assignedRooms.get(roomId)}" and "${zone.zone}".`,
        });
      } else {
        assignedRooms.set(roomId, zone.zone);
      }
    }
  }
  for (const room of analysis.rooms) {
    if (!assignedRooms.has(room.id)) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" (${room.id}) is not assigned to any zone.`,
      });
    }
  }

  // 3. Entry room should be in a zone near the entry edge
  const entryRoom = analysis.rooms.find((r) => r.id === analysis.entryRoomId);
  if (entryRoom) {
    const entryZone = analysis.zones.find((z) => z.rooms.includes(analysis.entryRoomId));
    if (entryZone && entryZone.region.edge !== analysis.entryEdge && entryZone.region.edge !== "center") {
      errors.push({
        severity: "error",
        message: `Entry room "${entryRoom.name}" is in zone "${entryZone.zone}" at ${entryZone.region.edge} edge, but entry is on ${analysis.entryEdge} edge. Entry room's zone must be on or near the entry edge.`,
      });
    }
  }

  // 4. Zone shares should sum to 80-120%
  const totalShare = analysis.zones.reduce((sum, z) => sum + z.region.approximateShare, 0);
  if (totalShare < 80) {
    errors.push({
      severity: "error",
      message: `Zone shares sum to ${totalShare}% which is below 80%. Adjust zone shares to cover the plot.`,
    });
  } else if (totalShare > 120) {
    errors.push({
      severity: "error",
      message: `Zone shares sum to ${totalShare}% which exceeds 120%. Reduce zone shares to be realistic.`,
    });
  }

  // 5. Setback validation
  if (analysis.siteConstraints.setbacks) {
    const s = analysis.siteConstraints.setbacks;
    const usableWidth = analysis.plot.width - (s.left ?? 0) - (s.right ?? 0);
    const usableHeight = analysis.plot.height - (s.top ?? 0) - (s.bottom ?? 0);
    if (usableWidth <= 0 || usableHeight <= 0) {
      errors.push({
        severity: "error",
        message: `Setbacks leave no usable interior: usable ${usableWidth}x${usableHeight} ft.`,
      });
    }
  }

  // 6. Public zone should be near entry edge (warning)
  const publicZones = analysis.zones.filter((z) => z.zone === "public");
  if (publicZones.length > 0) {
    const anyNearEntry = publicZones.some(
      (z) => z.region.edge === analysis.entryEdge || z.region.edge === "center"
    );
    if (!anyNearEntry) {
      errors.push({
        severity: "warning",
        message: `Public zone is not near the entry edge (${analysis.entryEdge}). Public spaces should typically be closest to the entrance.`,
      });
    }
  }

  // 7. Private zone should not be on entry edge (warning)
  const privateZones = analysis.zones.filter((z) => z.zone === "private");
  for (const pz of privateZones) {
    if (pz.region.edge === analysis.entryEdge) {
      errors.push({
        severity: "warning",
        message: `Private zone is on the entry edge (${analysis.entryEdge}). Private rooms should be away from the entrance for better privacy.`,
      });
    }
  }

  // 8. Required adjacency rooms in opposite zones (warning)
  const requiredAdjs = analysis.adjacencies.filter((a) => a.strength === "required");
  for (const adj of requiredAdjs) {
    const zoneA = analysis.zones.find((z) => z.rooms.includes(adj.roomId));
    const zoneB = analysis.zones.find((z) => z.rooms.includes(adj.adjacentTo));
    if (zoneA && zoneB && zoneA.region.edge !== "center" && zoneB.region.edge !== "center") {
      if (OPPOSITE_EDGES[zoneA.region.edge] === zoneB.region.edge) {
        const roomA = analysis.rooms.find((r) => r.id === adj.roomId);
        const roomB = analysis.rooms.find((r) => r.id === adj.adjacentTo);
        errors.push({
          severity: "warning",
          message: `Required adjacency "${roomA?.name ?? adj.roomId}" ↔ "${roomB?.name ?? adj.adjacentTo}" may be hard to satisfy: rooms are in opposite regions (${zoneA.region.edge} vs ${zoneB.region.edge}).`,
        });
      }
    }
  }

  return errors;
}

// ---- Geometry-only validation (checks 1-4 from validateFloorPlan) ----

export function validateRoomPlacement(
  plot: Plot,
  rooms: Room[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Rooms within plot boundaries
  for (const room of rooms) {
    if (room.x < 0 || room.y < 0) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" has negative coordinates (x:${room.x}, y:${room.y}).`,
      });
    }
    if (room.x + room.width > plot.width) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" exceeds plot width: x(${room.x}) + width(${room.width}) = ${room.x + room.width} > plot width(${plot.width}).`,
      });
    }
    if (room.y + room.height > plot.height) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" exceeds plot height: y(${room.y}) + height(${room.height}) = ${room.y + room.height} > plot height(${plot.height}).`,
      });
    }
  }

  // 2. Minimum dimension checks
  for (const room of rooms) {
    const minDim = room.type === "hallway" ? 3 : 5;
    if (room.width < minDim || room.height < minDim) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" (${room.type}) has a dimension below ${minDim}ft minimum: ${room.width}x${room.height}.`,
      });
    }
  }

  // 3. Aspect ratio checks
  for (const room of rooms) {
    const longer = Math.max(room.width, room.height);
    const shorter = Math.min(room.width, room.height);
    if (shorter === 0) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" has a zero dimension: ${room.width}x${room.height}.`,
      });
      continue;
    }
    const ratio = longer / shorter;
    const maxRatio = room.type === "hallway" ? 8 : 4;
    if (ratio > maxRatio) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" aspect ratio ${ratio.toFixed(1)}:1 exceeds ${maxRatio}:1 limit (${room.width}x${room.height}).`,
      });
    }
  }

  // 4. Room overlap detection
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (roomsOverlap(a, b)) {
        const overlapArea = computeOverlapArea(a, b);
        errors.push({
          severity: "error",
          message: `Rooms "${a.name}" and "${b.name}" overlap by ~${overlapArea} sqft. A: (${a.x},${a.y}) ${a.width}x${a.height}, B: (${b.x},${b.y}) ${b.width}x${b.height}.`,
        });
      }
    }
  }

  return errors;
}

// ---- Adjacency validation for place_rooms ----

export function validateAdjacencies(
  rooms: Room[],
  adjacencies: { roomId: string; adjacentTo: string; strength: "required" | "preferred" }[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  for (const adj of adjacencies) {
    const roomA = roomMap.get(adj.roomId);
    const roomB = roomMap.get(adj.adjacentTo);
    if (!roomA || !roomB) {
      errors.push({
        severity: "error",
        message: `Adjacency references unknown room ID: ${!roomA ? adj.roomId : adj.adjacentTo}.`,
      });
      continue;
    }
    if (!roomsShareWall(roomA, roomB)) {
      errors.push({
        severity: adj.strength === "required" ? "error" : "warning",
        message: `${adj.strength === "required" ? "Required" : "Preferred"} adjacency not satisfied: "${roomA.name}" and "${roomB.name}" do not share a wall.`,
      });
    }
  }

  return errors;
}

// ---- Room plan feasibility validation (no geometry) ----

export function validateRoomPlan(plan: RoomPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const plotArea = plan.plot.width * plan.plot.height;

  // 1. Room count
  if (plan.rooms.length === 0) {
    errors.push({ severity: "error", message: "Room plan must have at least 1 room." });
    return errors;
  }
  if (plan.rooms.length > 30) {
    errors.push({ severity: "error", message: `Too many rooms (${plan.rooms.length}). Maximum is 30.` });
  }

  // 2. Unique IDs
  const ids = new Set<string>();
  for (const room of plan.rooms) {
    if (ids.has(room.id)) {
      errors.push({ severity: "error", message: `Duplicate room ID "${room.id}".` });
    }
    ids.add(room.id);
  }

  // 3. Total area feasibility
  const totalArea = plan.rooms.reduce((sum, r) => sum + r.targetArea, 0);
  if (totalArea > plotArea * 1.05) {
    errors.push({
      severity: "error",
      message: `Total room area (${totalArea} sqft) exceeds plot capacity (${plotArea} sqft) by ${Math.round(((totalArea / plotArea) - 1) * 100)}%. Reduce room sizes or increase plot.`,
    });
  }
  if (totalArea < plotArea * 0.6) {
    errors.push({
      severity: "warning",
      message: `Total room area (${totalArea} sqft) uses only ${Math.round((totalArea / plotArea) * 100)}% of plot (${plotArea} sqft). Consider adding rooms or increasing room sizes.`,
    });
  }

  // 4. Individual room feasibility
  for (const room of plan.rooms) {
    const minDim = room.type === "hallway" ? 3 : 5;

    // Range validity
    if (room.widthRange[0] > room.widthRange[1]) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" widthRange min (${room.widthRange[0]}) exceeds max (${room.widthRange[1]}).`,
      });
    }
    if (room.heightRange[0] > room.heightRange[1]) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" heightRange min (${room.heightRange[0]}) exceeds max (${room.heightRange[1]}).`,
      });
    }

    // Minimum dimensions
    if (room.widthRange[0] < minDim) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" (${room.type}) min width ${room.widthRange[0]}ft is below ${minDim}ft minimum.`,
      });
    }
    if (room.heightRange[0] < minDim) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" (${room.type}) min height ${room.heightRange[0]}ft is below ${minDim}ft minimum.`,
      });
    }

    // Dimensions don't exceed plot
    if (room.widthRange[1] > plan.plot.width) {
      errors.push({
        severity: "warning",
        message: `Room "${room.name}" max width (${room.widthRange[1]}ft) exceeds plot width (${plan.plot.width}ft).`,
      });
    }
    if (room.heightRange[1] > plan.plot.height) {
      errors.push({
        severity: "warning",
        message: `Room "${room.name}" max height (${room.heightRange[1]}ft) exceeds plot height (${plan.plot.height}ft).`,
      });
    }

    // Aspect ratio at extremes
    const maxWidth = room.widthRange[1];
    const minHeight = room.heightRange[0];
    const maxHeight = room.heightRange[1];
    const minWidth = room.widthRange[0];
    if (minHeight > 0 && minWidth > 0) {
      const maxRatio = room.type === "hallway" ? 8 : 4;
      const worstRatio = Math.max(maxWidth / minHeight, maxHeight / minWidth);
      if (worstRatio > maxRatio) {
        errors.push({
          severity: "warning",
          message: `Room "${room.name}" dimension ranges could produce aspect ratio ${worstRatio.toFixed(1)}:1 (limit: ${maxRatio}:1). Narrow the ranges.`,
        });
      }
    }
  }

  // 5. Entry room exists
  if (!ids.has(plan.entryRoomId)) {
    errors.push({
      severity: "error",
      message: `entryRoomId "${plan.entryRoomId}" does not match any room ID.`,
    });
  }

  // 6. Adjacency references valid
  for (const adj of plan.adjacencies) {
    if (adj.roomId === adj.adjacentTo) {
      errors.push({
        severity: "error",
        message: `Self-adjacency: room "${adj.roomId}" listed as adjacent to itself.`,
      });
    }
    if (!ids.has(adj.roomId)) {
      errors.push({
        severity: "error",
        message: `Adjacency references unknown room ID "${adj.roomId}".`,
      });
    }
    if (!ids.has(adj.adjacentTo)) {
      errors.push({
        severity: "error",
        message: `Adjacency references unknown room ID "${adj.adjacentTo}".`,
      });
    }
  }

  // 7. Zoning sanity (warnings)
  const entryRoom = plan.rooms.find((r) => r.id === plan.entryRoomId);
  if (entryRoom && entryRoom.zone !== "public") {
    errors.push({
      severity: "warning",
      message: `Entry room "${entryRoom.name}" is in "${entryRoom.zone}" zone — should typically be "public".`,
    });
  }
  for (const room of plan.rooms) {
    if (room.type === "bedroom" && room.zone !== "private") {
      errors.push({
        severity: "warning",
        message: `Bedroom "${room.name}" is in "${room.zone}" zone — should typically be "private".`,
      });
    }
  }

  // 8. Kitchen-dining adjacency (warning if missing)
  const hasKitchen = plan.rooms.some((r) => r.type === "kitchen");
  const hasDining = plan.rooms.some((r) => r.type === "dining_room");
  if (hasKitchen && hasDining) {
    const kitchenIds = new Set(plan.rooms.filter((r) => r.type === "kitchen").map((r) => r.id));
    const diningIds = new Set(plan.rooms.filter((r) => r.type === "dining_room").map((r) => r.id));
    const hasKitchenDiningAdj = plan.adjacencies.some(
      (a) =>
        (kitchenIds.has(a.roomId) && diningIds.has(a.adjacentTo)) ||
        (diningIds.has(a.roomId) && kitchenIds.has(a.adjacentTo))
    );
    if (!hasKitchenDiningAdj) {
      errors.push({
        severity: "warning",
        message: "Kitchen and dining room exist but no adjacency requirement between them. Consider adding one.",
      });
    }
  }

  return errors;
}
