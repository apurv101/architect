import type { RoomType, FurnitureType, ElectricalFixtureType, PlumbingFixtureType, LightFixtureType, HVACElementType, LandscapeElementType } from "./types";

export const roomColors: Record<RoomType, string> = {
  bedroom: "#DBEAFE",
  bathroom: "#CFFAFE",
  kitchen: "#FEF9C3",
  living_room: "#D1FAE5",
  dining_room: "#FED7AA",
  hallway: "#F3F4F6",
  garage: "#E5E7EB",
  balcony: "#ECFCCB",
  utility: "#E5E7EB",
  entrance: "#EDE9FE",
  other: "#F9FAFB",
};

export const furnitureColors: Record<FurnitureType, string> = {
  bed: "#93C5FD",
  nightstand: "#A5B4FC",
  dresser: "#C4B5FD",
  desk: "#D8B4FE",
  chair: "#F0ABFC",
  sofa: "#86EFAC",
  coffee_table: "#6EE7B7",
  dining_table: "#FDBA74",
  dining_chair: "#FCD34D",
  tv_stand: "#A8A29E",
  bookshelf: "#FCA5A5",
  wardrobe: "#CBD5E1",
  toilet: "#67E8F9",
  sink: "#22D3EE",
  bathtub: "#7DD3FC",
  shower: "#BAE6FD",
  kitchen_counter: "#FDE68A",
  refrigerator: "#E2E8F0",
  stove: "#FECACA",
  washing_machine: "#DDD6FE",
};

export const electricalColors: Record<ElectricalFixtureType, string> = {
  outlet: "#F59E0B",
  gfci_outlet: "#EF4444",
  switch: "#3B82F6",
  dimmer: "#6366F1",
  three_way_switch: "#8B5CF6",
  ceiling_light: "#FBBF24",
  recessed_light: "#FCD34D",
  pendant: "#F59E0B",
  sconce: "#D97706",
  ceiling_fan: "#10B981",
  smoke_detector: "#EF4444",
  thermostat: "#06B6D4",
  panel: "#6B7280",
};

export const plumbingColors: Record<PlumbingFixtureType, string> = {
  supply_line: "#3B82F6",
  drain_line: "#6B7280",
  vent_stack: "#9CA3AF",
  water_heater: "#EF4444",
  main_shutoff: "#DC2626",
  cleanout: "#78716C",
  hose_bib: "#2563EB",
};

export const lightingColors: Record<LightFixtureType, string> = {
  ceiling: "#FBBF24",
  recessed: "#FDE68A",
  pendant: "#F59E0B",
  chandelier: "#D97706",
  sconce: "#FCD34D",
  track: "#EAB308",
  under_cabinet: "#FEF3C7",
  floor_lamp: "#CA8A04",
  table_lamp: "#A16207",
};

export const hvacColors: Record<HVACElementType, string> = {
  supply_vent: "#3B82F6",
  return_vent: "#EF4444",
  outdoor_unit: "#6B7280",
  furnace: "#F97316",
  thermostat: "#06B6D4",
  mini_split: "#10B981",
  exhaust_fan: "#8B5CF6",
};

export const landscapeColors: Record<LandscapeElementType, string> = {
  tree: "#166534",
  shrub: "#22C55E",
  garden_bed: "#86EFAC",
  lawn: "#BBF7D0",
  driveway: "#9CA3AF",
  walkway: "#D1D5DB",
  patio: "#D6D3D1",
  deck: "#A16207",
  fence: "#78716C",
  pool: "#38BDF8",
  fountain: "#7DD3FC",
};
