export type RoomType =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living_room"
  | "dining_room"
  | "hallway"
  | "garage"
  | "balcony"
  | "utility"
  | "entrance"
  | "other";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface Door {
  id: string;
  fromRoomId: string;
  toRoomId: string | null;
  x: number;
  y: number;
  width: number;
  orientation: "horizontal" | "vertical";
  swingDirection?: "inward" | "outward";
}

export interface Window {
  id: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  orientation: "horizontal" | "vertical";
}

export interface Plot {
  width: number;
  height: number;
  area: number;
}

export interface FloorPlan {
  plot: Plot;
  rooms: Room[];
  doors: Door[];
  windows?: Window[];
  notes: string;
}

// ---- Room Plan types (plan_rooms tool output) ----

export type ZoneType = "public" | "private" | "service";

export interface PlannedRoom {
  id: string;
  name: string;
  type: RoomType;
  zone: ZoneType;
  /** Target area in square feet */
  targetArea: number;
  /** Preferred width range [min, max] in feet */
  widthRange: [number, number];
  /** Preferred height range [min, max] in feet */
  heightRange: [number, number];
}

export interface AdjacencyRequirement {
  roomId: string;
  adjacentTo: string;
  strength: "required" | "preferred";
  reason: string;
}

export interface RoomPlan {
  plot: Plot;
  rooms: PlannedRoom[];
  adjacencies: AdjacencyRequirement[];
  entryRoomId: string;
  entryEdge: "top" | "bottom" | "left" | "right";
  notes: string;
}

// ---- Blocking Layout types (placed rooms output) ----

export interface BlockingLayout {
  plot: Plot;
  rooms: Room[];
  adjacencies: { roomId: string; adjacentTo: string; strength: "required" | "preferred" }[];
  notes: string;
}

export interface ImageAttachment {
  /** Base64-encoded image data (no data: prefix) */
  data: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}

export interface ThinkingStep {
  toolName: string;
  status: "running" | "done" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ImageAttachment[];
  artifacts?: import("../agent/types").Artifact[];
  thinkingSteps?: ThinkingStep[];
}
