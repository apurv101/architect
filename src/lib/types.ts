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

export type FurnitureType =
  | "bed"
  | "nightstand"
  | "dresser"
  | "desk"
  | "chair"
  | "sofa"
  | "coffee_table"
  | "dining_table"
  | "dining_chair"
  | "tv_stand"
  | "bookshelf"
  | "wardrobe"
  | "toilet"
  | "sink"
  | "bathtub"
  | "shower"
  | "kitchen_counter"
  | "refrigerator"
  | "stove"
  | "washing_machine";

export interface FurnitureItem {
  id: string;
  roomId: string;
  type: FurnitureType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

// ---- Electrical ----

export type ElectricalFixtureType =
  | "outlet"
  | "gfci_outlet"
  | "switch"
  | "dimmer"
  | "three_way_switch"
  | "ceiling_light"
  | "recessed_light"
  | "pendant"
  | "sconce"
  | "ceiling_fan"
  | "smoke_detector"
  | "thermostat"
  | "panel";

export interface ElectricalFixture {
  id: string;
  roomId: string;
  type: ElectricalFixtureType;
  name: string;
  x: number;
  y: number;
}

export interface ElectricalCircuit {
  id: string;
  name: string;
  amperage: number;
  fixtures: string[];
}

// ---- Plumbing ----

export type PlumbingFixtureType =
  | "supply_line"
  | "drain_line"
  | "vent_stack"
  | "water_heater"
  | "main_shutoff"
  | "cleanout"
  | "hose_bib";

export interface PlumbingFixture {
  id: string;
  roomId: string;
  type: PlumbingFixtureType;
  name: string;
  x: number;
  y: number;
}

export interface PlumbingRun {
  id: string;
  type: "hot_supply" | "cold_supply" | "drain" | "vent";
  points: { x: number; y: number }[];
}

// ---- Lighting ----

export type LightFixtureType =
  | "ceiling"
  | "recessed"
  | "pendant"
  | "chandelier"
  | "sconce"
  | "track"
  | "under_cabinet"
  | "floor_lamp"
  | "table_lamp";

export interface LightFixture {
  id: string;
  roomId: string;
  type: LightFixtureType;
  name: string;
  x: number;
  y: number;
  lumens: number;
  coverageRadius: number;
}

// ---- HVAC ----

export type HVACElementType =
  | "supply_vent"
  | "return_vent"
  | "outdoor_unit"
  | "furnace"
  | "thermostat"
  | "mini_split"
  | "exhaust_fan";

export interface HVACElement {
  id: string;
  roomId: string;
  type: HVACElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DuctRun {
  id: string;
  type: "supply" | "return" | "exhaust";
  points: { x: number; y: number }[];
  widthInches: number;
}

// ---- Landscaping ----

export type LandscapeElementType =
  | "tree"
  | "shrub"
  | "garden_bed"
  | "lawn"
  | "driveway"
  | "walkway"
  | "patio"
  | "deck"
  | "fence"
  | "pool"
  | "fountain";

export interface LandscapeElement {
  id: string;
  type: LandscapeElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Multi-Story ----

export interface Staircase {
  id: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "up" | "down" | "both";
  orientation: "horizontal" | "vertical";
}

export interface Elevator {
  id: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Annotation ----

export interface Annotation {
  id: string;
  type: "label" | "callout" | "dimension" | "note";
  text: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  fontSize?: number;
  color?: string;
}

// ---- Cost Estimate ----

export interface CostLineItem {
  category: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  totalCost: number;
}

export interface CostEstimate {
  totalCost: number;
  currency: string;
  breakdown: CostLineItem[];
  notes: string;
}

// ---- Elevation View ----

export interface ElevationElement {
  type: "wall" | "window" | "door" | "roof" | "foundation" | "chimney" | "column";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
}

export interface ElevationView {
  direction: "north" | "south" | "east" | "west";
  width: number;
  height: number;
  wallHeight: number;
  roofHeight: number;
  elements: ElevationElement[];
  notes: string;
}

// ---- Style Palette ----

export interface RoomStyle {
  roomId: string;
  roomName: string;
  flooringType: string;
  flooringColor: string;
  wallColor: string;
  accentColor: string;
  materials: string[];
  notes?: string;
}

export interface StylePalette {
  overallStyle: string;
  colorScheme: string;
  rooms: RoomStyle[];
  notes: string;
}

// ---- Floor Plan (augmented) ----

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
  furniture?: FurnitureItem[];
  electrical?: ElectricalFixture[];
  electricalCircuits?: ElectricalCircuit[];
  plumbing?: PlumbingFixture[];
  plumbingRuns?: PlumbingRun[];
  lighting?: LightFixture[];
  hvac?: HVACElement[];
  ductRuns?: DuctRun[];
  landscaping?: LandscapeElement[];
  staircases?: Staircase[];
  elevators?: Elevator[];
  annotations?: Annotation[];
  floorLevel?: number;
  floorName?: string;
  notes: string;
}

export interface ImageAttachment {
  /** Base64-encoded image data (no data: prefix) */
  data: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ImageAttachment[];
  artifacts?: import("../agent/types").Artifact[];
}
