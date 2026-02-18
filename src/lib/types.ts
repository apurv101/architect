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
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifacts?: import("../agent/types").Artifact[];
}
