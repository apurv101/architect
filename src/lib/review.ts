import type { FloorPlan, Room, RoomType } from "./types";
import type { ProviderId } from "../agent/providers/types";
import { roomsShareWall } from "./validation";
import { simpleCompletion } from "../agent/providers";
import {
  DYNAMIC_REVIEW_SYSTEM_PROMPT,
  buildDynamicReviewUserMessage,
} from "./review-prompt";

// ── Types ────────────────────────────────────────────────

export type ReviewSeverity = "critical" | "warning" | "suggestion";

export interface ReviewIssue {
  severity: ReviewSeverity;
  code: string;
  message: string;
  affectedRooms: string[];
}

export interface ReviewResult {
  issues: ReviewIssue[];
  summary: string;
  passed: boolean;
}

// ── Door graph ───────────────────────────────────────────

interface BFSNode {
  depth: number;
  path: string[];
}

function buildDoorGraph(fp: FloorPlan): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  // Initialize all rooms
  for (const room of fp.rooms) {
    graph.set(room.id, new Set());
  }

  // Add edges from doors
  for (const door of fp.doors) {
    if (door.toRoomId === null) continue; // exterior door
    const from = graph.get(door.fromRoomId);
    const to = graph.get(door.toRoomId);
    if (from) from.add(door.toRoomId);
    if (to) to.add(door.fromRoomId);
  }

  return graph;
}

function findEntranceRoomId(fp: FloorPlan): string | null {
  // 1. Room typed as "entrance"
  const entranceRoom = fp.rooms.find((r) => r.type === "entrance");
  if (entranceRoom) return entranceRoom.id;

  // 2. Room connected to an exterior door
  const exteriorDoor = fp.doors.find((d) => d.toRoomId === null);
  if (exteriorDoor) return exteriorDoor.fromRoomId;

  return null;
}

function bfs(
  graph: Map<string, Set<string>>,
  startId: string
): Map<string, BFSNode> {
  const visited = new Map<string, BFSNode>();
  const queue: Array<{ id: string; depth: number; path: string[] }> = [
    { id: startId, depth: 0, path: [startId] },
  ];

  while (queue.length > 0) {
    const { id, depth, path } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.set(id, { depth, path });

    const neighbors = graph.get(id) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({
          id: neighbor,
          depth: depth + 1,
          path: [...path, neighbor],
        });
      }
    }
  }

  return visited;
}

// ── Room lookup helper ───────────────────────────────────

function roomById(fp: FloorPlan): Map<string, Room> {
  const map = new Map<string, Room>();
  for (const r of fp.rooms) map.set(r.id, r);
  return map;
}

// ── Individual checks ────────────────────────────────────

const HABITABLE_TYPES: Set<RoomType> = new Set([
  "bedroom",
  "living_room",
  "dining_room",
  "kitchen",
]);

/** Check 1: Room reachability via BFS from entrance */
function checkReachability(
  fp: FloorPlan,
  visited: Map<string, BFSNode>,
  entranceId: string | null
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  if (!entranceId) {
    issues.push({
      severity: "critical",
      code: "NO_ENTRANCE",
      message:
        "No entrance room or exterior door found. Every floor plan needs an entrance.",
      affectedRooms: [],
    });
    return issues;
  }

  for (const room of fp.rooms) {
    if (!visited.has(room.id)) {
      issues.push({
        severity: "critical",
        code: "UNREACHABLE_ROOM",
        message: `"${room.name}" (${room.type}) is not reachable from the entrance. Add a door connecting it to an accessible room.`,
        affectedRooms: [room.id],
      });
    }
  }

  return issues;
}

/** Check 2: Bathroom-to-bathroom door */
function checkBathroomToBathroom(fp: FloorPlan, rooms: Map<string, Room>): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const door of fp.doors) {
    if (door.toRoomId === null) continue;
    const from = rooms.get(door.fromRoomId);
    const to = rooms.get(door.toRoomId);
    if (from?.type === "bathroom" && to?.type === "bathroom") {
      issues.push({
        severity: "critical",
        code: "BATHROOM_TO_BATHROOM",
        message: `"${from.name}" and "${to.name}" are connected by a door. Bathrooms should not open into each other.`,
        affectedRooms: [from.id, to.id],
      });
    }
  }

  return issues;
}

/** Check 3: Bathroom opens into kitchen */
function checkBathroomToKitchen(fp: FloorPlan, rooms: Map<string, Room>): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const door of fp.doors) {
    if (door.toRoomId === null) continue;
    const from = rooms.get(door.fromRoomId);
    const to = rooms.get(door.toRoomId);
    if (!from || !to) continue;

    const types = new Set([from.type, to.type]);
    if (types.has("bathroom") && types.has("kitchen")) {
      const bathName = from.type === "bathroom" ? from.name : to.name;
      const kitchenName = from.type === "kitchen" ? from.name : to.name;
      issues.push({
        severity: "critical",
        code: "BATHROOM_TO_KITCHEN",
        message: `"${bathName}" opens directly into "${kitchenName}". Route bathroom access through a hallway instead.`,
        affectedRooms: [from.id, to.id],
      });
    }
  }

  return issues;
}

/** Check 4: Bathroom opens into living/dining room */
function checkBathroomToPublic(fp: FloorPlan, rooms: Map<string, Room>): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const publicTypes: Set<RoomType> = new Set(["living_room", "dining_room"]);

  for (const door of fp.doors) {
    if (door.toRoomId === null) continue;
    const from = rooms.get(door.fromRoomId);
    const to = rooms.get(door.toRoomId);
    if (!from || !to) continue;

    const isBathToPublic =
      (from.type === "bathroom" && publicTypes.has(to.type)) ||
      (to.type === "bathroom" && publicTypes.has(from.type));

    if (isBathToPublic) {
      const bathName = from.type === "bathroom" ? from.name : to.name;
      const publicName = from.type === "bathroom" ? to.name : from.name;
      issues.push({
        severity: "warning",
        code: "BATHROOM_TO_PUBLIC",
        message: `"${bathName}" opens directly into "${publicName}". Bathrooms should open into hallways or bedrooms, not public rooms.`,
        affectedRooms: [from.id, to.id],
      });
    }
  }

  return issues;
}

/** Check 5: Bedroom only accessible through another bedroom */
function checkBedroomThroughBedroom(
  fp: FloorPlan,
  rooms: Map<string, Room>,
  visited: Map<string, BFSNode>
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const seen = new Set<string>();

  for (const room of fp.rooms) {
    if (room.type !== "bedroom") continue;
    const node = visited.get(room.id);
    if (!node) continue;

    // Check if path from entrance passes through another bedroom
    for (let i = 1; i < node.path.length - 1; i++) {
      const intermediate = rooms.get(node.path[i]);
      if (intermediate?.type === "bedroom") {
        const pairKey = [room.id, intermediate.id].sort().join(":");
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        issues.push({
          severity: "warning",
          code: "BEDROOM_THROUGH_BEDROOM",
          message: `"${room.name}" is only accessible by passing through "${intermediate.name}". Add a hallway to provide independent access.`,
          affectedRooms: [room.id, intermediate.id],
        });
        break;
      }
    }
  }

  return issues;
}

/** Check 6: Kitchen not adjacent to dining room */
function checkKitchenDiningAdjacency(fp: FloorPlan): ReviewIssue[] {
  const kitchens = fp.rooms.filter((r) => r.type === "kitchen");
  const diningRooms = fp.rooms.filter((r) => r.type === "dining_room");

  // Only check if both exist
  if (kitchens.length === 0 || diningRooms.length === 0) return [];

  // Check if any kitchen shares a wall with any dining room
  for (const kitchen of kitchens) {
    for (const dining of diningRooms) {
      if (roomsShareWall(kitchen, dining)) return [];
    }
  }

  return [
    {
      severity: "warning",
      code: "KITCHEN_DINING_DISCONNECTED",
      message: `Kitchen and dining room don't share a wall. They should be adjacent for functional flow.`,
      affectedRooms: [
        ...kitchens.map((r) => r.id),
        ...diningRooms.map((r) => r.id),
      ],
    },
  ];
}

/** Check 7: Habitable room without window */
function checkMissingWindows(fp: FloorPlan): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const windowRoomIds = new Set((fp.windows ?? []).map((w) => w.roomId));

  for (const room of fp.rooms) {
    if (HABITABLE_TYPES.has(room.type) && !windowRoomIds.has(room.id)) {
      issues.push({
        severity: "warning",
        code: "MISSING_WINDOW",
        message: `"${room.name}" (${room.type}) has no window. Habitable rooms need natural light.`,
        affectedRooms: [room.id],
      });
    }
  }

  return issues;
}

/** Check 8: Bedroom with no bathroom within 2 door-hops */
function checkBathroomDistance(
  fp: FloorPlan,
  graph: Map<string, Set<string>>
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const bathroomIds = fp.rooms
    .filter((r) => r.type === "bathroom")
    .map((r) => r.id);

  if (bathroomIds.length === 0) return [];

  for (const room of fp.rooms) {
    if (room.type !== "bedroom") continue;

    // BFS from this bedroom, check if a bathroom is within 2 hops
    const bedroomVisited = bfs(graph, room.id);
    let closestBathDist = Infinity;

    for (const bathId of bathroomIds) {
      const node = bedroomVisited.get(bathId);
      if (node && node.depth < closestBathDist) {
        closestBathDist = node.depth;
      }
    }

    if (closestBathDist > 2) {
      issues.push({
        severity: "suggestion",
        code: "FAR_BATHROOM",
        message: `"${room.name}" is ${closestBathDist} doors away from the nearest bathroom. Consider adding a closer bathroom.`,
        affectedRooms: [room.id],
      });
    }
  }

  return issues;
}

/** Check 9: Room requires 4+ doors to reach from entrance */
function checkDeepNesting(
  fp: FloorPlan,
  visited: Map<string, BFSNode>
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const room of fp.rooms) {
    const node = visited.get(room.id);
    if (node && node.depth >= 4) {
      issues.push({
        severity: "suggestion",
        code: "DEEP_NESTING",
        message: `"${room.name}" requires ${node.depth} doors to reach from the entrance. Consider adding a hallway for better circulation.`,
        affectedRooms: [room.id],
      });
    }
  }

  return issues;
}

// ── Dynamic human journey review ─────────────────────────

/**
 * Call an LLM to generate and evaluate context-specific human journey
 * scenarios based on the user's original prompt and the floor plan.
 * Returns suggestion-severity issues. Never throws — returns [] on failure.
 */
export async function dynamicHumanJourneyReview(
  fp: FloorPlan,
  userPrompt: string,
  apiKey: string,
  provider: ProviderId
): Promise<ReviewIssue[]> {
  try {
    const userMessage = buildDynamicReviewUserMessage(fp, userPrompt);
    const response = await simpleCompletion(
      provider,
      apiKey,
      DYNAMIC_REVIEW_SYSTEM_PROMPT,
      userMessage
    );

    // Extract JSON array from response (may be wrapped in markdown code fences)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    // Validate and normalize each issue
    const validRoomIds = new Set(fp.rooms.map((r) => r.id));
    const issues: ReviewIssue[] = [];

    for (const item of parsed) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).code !== "string" ||
        typeof (item as Record<string, unknown>).message !== "string"
      ) {
        continue;
      }

      const raw = item as {
        code: string;
        message: string;
        affectedRooms?: unknown;
      };

      // Filter affectedRooms to only valid IDs
      const affected = Array.isArray(raw.affectedRooms)
        ? (raw.affectedRooms as unknown[])
            .filter((id): id is string => typeof id === "string" && validRoomIds.has(id))
        : [];

      issues.push({
        severity: "suggestion",
        code: raw.code,
        message: raw.message,
        affectedRooms: affected,
      });
    }

    return issues;
  } catch {
    // Dynamic review is non-critical — silently return empty on failure
    return [];
  }
}

// ── Main export ──────────────────────────────────────────

export function reviewFloorPlan(fp: FloorPlan): ReviewResult {
  const rooms = roomById(fp);
  const graph = buildDoorGraph(fp);
  const entranceId = findEntranceRoomId(fp);
  const visited = entranceId ? bfs(graph, entranceId) : new Map<string, BFSNode>();

  const issues: ReviewIssue[] = [
    ...checkReachability(fp, visited, entranceId),
    ...checkBathroomToBathroom(fp, rooms),
    ...checkBathroomToKitchen(fp, rooms),
    ...checkBathroomToPublic(fp, rooms),
    ...checkBedroomThroughBedroom(fp, rooms, visited),
    ...checkKitchenDiningAdjacency(fp),
    ...checkMissingWindows(fp),
    ...checkBathroomDistance(fp, graph),
    ...checkDeepNesting(fp, visited),
  ];

  const criticals = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const suggestions = issues.filter((i) => i.severity === "suggestion").length;

  const parts: string[] = [];
  if (criticals > 0) parts.push(`${criticals} critical`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? "s" : ""}`);
  if (suggestions > 0)
    parts.push(`${suggestions} suggestion${suggestions > 1 ? "s" : ""}`);

  const summary =
    parts.length > 0
      ? parts.join(", ")
      : "All checks passed — no architectural issues found";

  return {
    issues,
    summary,
    passed: criticals === 0,
  };
}
