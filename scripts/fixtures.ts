/**
 * Offline fixtures — hand-crafted FloorPlan objects for each eval prompt.
 *
 * These go directly through the validation pipeline (no LLM, no layout engine).
 * Each fixture is a grid of rooms with auto-generated doors and windows.
 *
 * Add/remove entries to match the prompts in prompts.ts.
 */
import type { FloorPlan, Room, Door, Window, RoomType } from "../src/lib/types";

const ROOM_COLORS: Record<RoomType, string> = {
  bedroom: "#DBEAFE", bathroom: "#CFFAFE", kitchen: "#FEF9C3",
  living_room: "#D1FAE5", dining_room: "#FED7AA", hallway: "#F3F4F6",
  garage: "#E5E7EB", balcony: "#ECFCCB", utility: "#E5E7EB",
  entrance: "#EDE9FE", other: "#F9FAFB",
};

// ── Grid helper ─────────────────────────────────────────

interface CellSpec { id: string; name: string; type: RoomType; w: number }
interface RowSpec { h: number; cells: CellSpec[] }
interface GridSpec {
  plotW: number;
  plotH: number;
  rows: RowSpec[];
  notes: string;
}

/**
 * Build a FloorPlan from a simple grid spec.
 * Rooms tile left-to-right per row, rows stack top-to-bottom.
 * Auto-generates doors between adjacent rooms and windows on exterior walls.
 */
function grid(spec: GridSpec): FloorPlan {
  const rooms: Room[] = [];
  const doors: Door[] = [];
  const windows: Window[] = [];
  let dId = 1, wId = 1;

  // Place rooms
  let y = 0;
  for (const row of spec.rows) {
    let x = 0;
    for (const c of row.cells) {
      rooms.push({
        id: c.id, name: c.name, type: c.type,
        x, y, width: c.w, height: row.h,
        color: ROOM_COLORS[c.type],
      });
      x += c.w;
    }
    y += row.h;
  }

  // Auto-place doors between adjacent rooms
  const paired = new Set<string>();
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const key = `${a.id}:${b.id}`;
      if (paired.has(key)) continue;
      const DW = 3;

      // Vertical shared wall
      for (const [left, right] of [[a, b], [b, a]]) {
        if (Math.abs((left.x + left.width) - right.x) < 0.5) {
          const s = Math.max(left.y, right.y);
          const e = Math.min(left.y + left.height, right.y + right.height);
          if (e - s >= DW + 1) {
            doors.push({ id: `d${dId++}`, fromRoomId: left.id, toRoomId: right.id, x: left.x + left.width, y: s + 1, width: DW, orientation: "vertical" });
            paired.add(key); break;
          }
        }
      }
      if (paired.has(key)) continue;

      // Horizontal shared wall
      for (const [top, bot] of [[a, b], [b, a]]) {
        if (Math.abs((top.y + top.height) - bot.y) < 0.5) {
          const s = Math.max(top.x, bot.x);
          const e = Math.min(top.x + top.width, bot.x + bot.width);
          if (e - s >= DW + 1) {
            doors.push({ id: `d${dId++}`, fromRoomId: top.id, toRoomId: bot.id, x: s + 1, y: top.y + top.height, width: DW, orientation: "horizontal" });
            paired.add(key); break;
          }
        }
      }
    }
  }

  // Exterior door on first room touching y=0
  const er = rooms.find((r) => r.y === 0);
  if (er) doors.push({ id: `d${dId++}`, fromRoomId: er.id, toRoomId: null, x: er.x + 2, y: 0, width: 3, orientation: "horizontal" });

  // Windows on exterior walls
  const WIN: Partial<Record<RoomType, { w: number }>> = {
    bedroom: { w: 4 }, living_room: { w: 4 }, kitchen: { w: 3 }, dining_room: { w: 4 },
  };
  for (const r of rooms) {
    const need = WIN[r.type];
    if (!need) continue;
    let placed = false;
    if (r.y === 0 && r.width >= need.w + 2 && !placed) {
      windows.push({ id: `w${wId++}`, roomId: r.id, x: r.x + Math.round((r.width - need.w) / 2), y: 0, width: need.w, orientation: "horizontal" });
      placed = true;
    }
    if (Math.abs(r.y + r.height - spec.plotH) < 0.5 && r.width >= need.w + 2 && !placed) {
      windows.push({ id: `w${wId++}`, roomId: r.id, x: r.x + Math.round((r.width - need.w) / 2), y: spec.plotH, width: need.w, orientation: "horizontal" });
      placed = true;
    }
    if (r.x === 0 && r.height >= need.w + 2 && !placed) {
      windows.push({ id: `w${wId++}`, roomId: r.id, x: 0, y: r.y + Math.round((r.height - need.w) / 2), width: need.w, orientation: "vertical" });
      placed = true;
    }
    if (Math.abs(r.x + r.width - spec.plotW) < 0.5 && r.height >= need.w + 2 && !placed) {
      windows.push({ id: `w${wId++}`, roomId: r.id, x: spec.plotW, y: r.y + Math.round((r.height - need.w) / 2), width: need.w, orientation: "vertical" });
    }
  }

  return {
    plot: { width: spec.plotW, height: spec.plotH, area: spec.plotW * spec.plotH },
    rooms, doors, windows,
    notes: spec.notes,
  };
}

// ── Fixtures ────────────────────────────────────────────

const fixtures: Record<string, FloorPlan> = {

  // 1. Studio (20×20 = 400 sq ft)
  //  ┌──────────────┬──────┐
  //  │   Living     │ Kit  │
  //  │  (14×12)     │(6×12)│
  //  ├──────────────┼──────┤
  //  │  Living ext  │ Bath │
  //  │  (14×8)      │(6×8) │
  //  └──────────────┴──────┘
  "studio-apartment": grid({
    plotW: 20, plotH: 20,
    rows: [
      { h: 12, cells: [
        { id: "living", name: "Living / Sleeping", type: "living_room", w: 14 },
        { id: "kitchen", name: "Kitchenette", type: "kitchen", w: 6 },
      ]},
      { h: 8, cells: [
        { id: "living2", name: "Living Nook", type: "living_room", w: 14 },
        { id: "bath", name: "Bathroom", type: "bathroom", w: 6 },
      ]},
    ],
    notes: "Compact studio apartment, ~400 sq ft.",
  }),

  // 2. 2BHK (30×30 = 900 sq ft)
  //  ┌──────────────────┬────────────┐
  //  │   Living / Hall  │  Kitchen   │
  //  │     (18×15)      │  (12×15)   │
  //  ├────────┬─────┬───┼──────┬─────┤
  //  │ Bed 1  │Bed 2│Bt1│ Bt2  │Hall │
  //  │(10×15) │(8×15│5×15│(5×15)│     │
  //  └────────┴─────┴───┴──────┴─────┘
  "2bhk": grid({
    plotW: 30, plotH: 30,
    rows: [
      { h: 15, cells: [
        { id: "hall", name: "Living / Hall", type: "living_room", w: 18 },
        { id: "kitchen", name: "Kitchen", type: "kitchen", w: 12 },
      ]},
      { h: 15, cells: [
        { id: "bed1", name: "Bedroom 1", type: "bedroom", w: 10 },
        { id: "bed2", name: "Bedroom 2", type: "bedroom", w: 8 },
        { id: "bath1", name: "Bathroom 1", type: "bathroom", w: 7 },
        { id: "bath2", name: "Bathroom 2", type: "bathroom", w: 5 },
      ]},
    ],
    notes: "2BHK apartment, ~900 sq ft.",
  }),

  // 3. 3BHK (50×30 = 1500 sq ft)
  "3bhk-family": grid({
    plotW: 50, plotH: 30,
    rows: [
      { h: 14, cells: [
        { id: "living", name: "Living Room", type: "living_room", w: 18 },
        { id: "dining", name: "Dining Area", type: "dining_room", w: 12 },
        { id: "kitchen", name: "Kitchen", type: "kitchen", w: 12 },
        { id: "utility", name: "Utility Room", type: "utility", w: 8 },
      ]},
      { h: 16, cells: [
        { id: "master", name: "Master Bedroom", type: "bedroom", w: 14 },
        { id: "mbath", name: "Master Bath", type: "bathroom", w: 8 },
        { id: "bed2", name: "Bedroom 2", type: "bedroom", w: 10 },
        { id: "bath2", name: "Bathroom 2", type: "bathroom", w: 6 },
        { id: "bed3", name: "Bedroom 3", type: "bedroom", w: 12 },
      ]},
    ],
    notes: "3BHK family home, ~1500 sq ft, master with attached bath.",
  }),

  // 4. Narrow lot (20×49)
  "narrow-lot": grid({
    plotW: 20, plotH: 49,
    rows: [
      { h: 15, cells: [
        { id: "living", name: "Living Room", type: "living_room", w: 20 },
      ]},
      { h: 12, cells: [
        { id: "kitchen", name: "Kitchen", type: "kitchen", w: 20 },
      ]},
      { h: 14, cells: [
        { id: "bed1", name: "Bedroom 1", type: "bedroom", w: 10 },
        { id: "bed2", name: "Bedroom 2", type: "bedroom", w: 10 },
      ]},
      { h: 8, cells: [
        { id: "bath", name: "Bathroom", type: "bathroom", w: 10 },
        { id: "hallway", name: "Hallway", type: "hallway", w: 10 },
      ]},
    ],
    notes: "Narrow lot house, 20ft wide.",
  }),

  // 5. Corner lot (50×30)
  "corner-lot": grid({
    plotW: 50, plotH: 30,
    rows: [
      { h: 16, cells: [
        { id: "living", name: "Living Room", type: "living_room", w: 18 },
        { id: "dining", name: "Dining Room", type: "dining_room", w: 14 },
        { id: "kitchen", name: "Kitchen", type: "kitchen", w: 18 },
      ]},
      { h: 14, cells: [
        { id: "garage", name: "Garage", type: "garage", w: 14 },
        { id: "bed1", name: "Bedroom 1", type: "bedroom", w: 10 },
        { id: "bed2", name: "Bedroom 2", type: "bedroom", w: 8 },
        { id: "bed3", name: "Bedroom 3", type: "bedroom", w: 8 },
        { id: "bath1", name: "Bathroom 1", type: "bathroom", w: 5 },
        { id: "bath2", name: "Bathroom 2", type: "bathroom", w: 5 },
      ]},
    ],
    notes: "Corner-lot house, 50×50 lot.",
  }),

  // 6. Furnished 1BHK (25×24 = 600 sq ft)
  "furnished-1bhk": grid({
    plotW: 25, plotH: 24,
    rows: [
      { h: 14, cells: [
        { id: "living", name: "Living Room", type: "living_room", w: 15 },
        { id: "kitchen", name: "Kitchen", type: "kitchen", w: 10 },
      ]},
      { h: 10, cells: [
        { id: "bedroom", name: "Bedroom", type: "bedroom", w: 15 },
        { id: "bath", name: "Bathroom", type: "bathroom", w: 10 },
      ]},
    ],
    notes: "Furnished 1BHK apartment, ~600 sq ft.",
  }),

  // 7. Office floor (50×30)
  "office-floor": grid({
    plotW: 50, plotH: 30,
    rows: [
      { h: 16, cells: [
        { id: "reception", name: "Reception", type: "entrance", w: 14 },
        { id: "office1", name: "Office 1", type: "other", w: 9 },
        { id: "office2", name: "Office 2", type: "other", w: 9 },
        { id: "office3", name: "Office 3", type: "other", w: 9 },
        { id: "office4", name: "Office 4", type: "other", w: 9 },
      ]},
      { h: 14, cells: [
        { id: "conference", name: "Conference Room", type: "other", w: 18 },
        { id: "breakroom", name: "Break Room", type: "kitchen", w: 12 },
        { id: "bath1", name: "Bathroom 1", type: "bathroom", w: 10 },
        { id: "bath2", name: "Bathroom 2", type: "bathroom", w: 10 },
      ]},
    ],
    notes: "Open-plan office floor, ~2000 sq ft.",
  }),

  // 8. Restaurant (40×30)
  "restaurant": grid({
    plotW: 40, plotH: 30,
    rows: [
      { h: 18, cells: [
        { id: "dining", name: "Dining Area", type: "dining_room", w: 24 },
        { id: "kitchen", name: "Kitchen", type: "kitchen", w: 16 },
      ]},
      { h: 12, cells: [
        { id: "entrance", name: "Entrance Vestibule", type: "entrance", w: 10 },
        { id: "bath1", name: "Bathroom 1", type: "bathroom", w: 7 },
        { id: "bath2", name: "Accessible Bath", type: "bathroom", w: 7 },
        { id: "storage", name: "Storage Room", type: "utility", w: 16 },
      ]},
    ],
    notes: "Small restaurant, ~1200 sq ft.",
  }),

  // 9. Tiny house (20×10 = 200 sq ft) — manual since rooms share a column
  "tiny-house": {
    plot: { width: 20, height: 10, area: 200 },
    rooms: [
      { id: "living", name: "Living / Sleeping", type: "living_room", x: 0, y: 0, width: 12, height: 10, color: "#D1FAE5" },
      { id: "kitchen", name: "Kitchen", type: "kitchen", x: 12, y: 0, width: 8, height: 5, color: "#FEF9C3" },
      { id: "bath", name: "Bathroom", type: "bathroom", x: 12, y: 5, width: 8, height: 5, color: "#CFFAFE" },
    ],
    doors: [
      { id: "d1", fromRoomId: "living", toRoomId: null, x: 2, y: 0, width: 3, orientation: "horizontal" },
      { id: "d2", fromRoomId: "living", toRoomId: "kitchen", x: 12, y: 1, width: 3, orientation: "vertical" },
      { id: "d3", fromRoomId: "living", toRoomId: "bath", x: 12, y: 6, width: 3, orientation: "vertical" },
    ],
    windows: [
      { id: "w1", roomId: "living", x: 0, y: 3, width: 4, orientation: "vertical" },
      { id: "w2", roomId: "kitchen", x: 16, y: 0, width: 3, orientation: "horizontal" },
    ],
    notes: "Tiny house, ~200 sq ft.",
  },

  // 10. Large villa (80×38)
  "large-villa": grid({
    plotW: 80, plotH: 38,
    rows: [
      { h: 20, cells: [
        { id: "foyer", name: "Grand Foyer", type: "entrance", w: 10 },
        { id: "living", name: "Formal Living Room", type: "living_room", w: 16 },
        { id: "family", name: "Family Room", type: "living_room", w: 14 },
        { id: "dining", name: "Dining Room", type: "dining_room", w: 12 },
        { id: "kitchen", name: "Gourmet Kitchen", type: "kitchen", w: 14 },
        { id: "office", name: "Home Office", type: "other", w: 14 },
      ]},
      { h: 18, cells: [
        { id: "master", name: "Master Bedroom", type: "bedroom", w: 16 },
        { id: "mbath", name: "Master Bath", type: "bathroom", w: 8 },
        { id: "bed2", name: "Bedroom 2", type: "bedroom", w: 10 },
        { id: "bath2", name: "Bathroom 2", type: "bathroom", w: 6 },
        { id: "bed3", name: "Bedroom 3", type: "bedroom", w: 10 },
        { id: "bed4", name: "Bedroom 4", type: "bedroom", w: 8 },
        { id: "bed5", name: "Bedroom 5", type: "bedroom", w: 8 },
        { id: "bath3", name: "Bathroom 3", type: "bathroom", w: 5 },
        { id: "garage", name: "Garage", type: "garage", w: 9 },
      ]},
    ],
    notes: "Luxury villa, ~4000 sq ft, 5 bedrooms.",
  }),
};

export default fixtures;
