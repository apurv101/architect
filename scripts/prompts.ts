/**
 * ============================================================
 * EVAL PROMPTS — edit this list to add/remove test cases
 * ============================================================
 *
 * Each entry has:
 *   - id:     short slug used in filenames and logs
 *   - prompt: the user message sent to the agent
 *   - expect: (optional) what you expect in the output, for your own reference
 *
 * Run all:   npm run eval
 * Run one:   npm run eval -- --only <id>
 * Provider:  npm run eval -- --provider anthropic|openai|gemini
 */

export interface EvalPrompt {
  id: string;
  prompt: string;
  /** Human notes on what a good result looks like (not checked automatically) */
  expect?: string;
}

const prompts: EvalPrompt[] = [
  // ── Basic floor plans ──────────────────────────────────
  {
    id: "studio-apartment",
    prompt: "Design a 400 sq ft studio apartment with a bathroom, kitchenette, and a combined living/sleeping area.",
    expect: "Small plot (~20x20), 2-3 rooms, doors between rooms, at least 1 window",
  },
  {
    id: "2bhk",
    prompt: "Design a 2BHK apartment (2 bedrooms, 1 hall, 1 kitchen, 2 bathrooms) around 900 sq ft.",
    expect: "~900 sq ft total, 6 rooms, hallway connecting rooms, doors and windows",
  },
  {
    id: "3bhk-family",
    prompt:
      "Design a 3BHK family home with a large living room, open kitchen, dining area, 3 bedrooms (one master with attached bathroom), 2 additional bathrooms, and a utility room. About 1500 sq ft.",
    expect: "8-10 rooms, master bedroom adjacent to its bathroom, all rooms accessible",
  },

  // ── Specific constraints ───────────────────────────────
  {
    id: "narrow-lot",
    prompt:
      "Design a narrow house on a 20ft x 60ft lot. It should have 2 bedrooms, a bathroom, kitchen, and living room. Rooms should be arranged linearly.",
    expect: "Plot 20x60, rooms stacked vertically or side by side within narrow width",
  },
  {
    id: "corner-lot",
    prompt:
      "Design a corner-lot house (50ft x 50ft) with windows on two exterior walls. Include a garage, 3 bedrooms, 2 bathrooms, kitchen, living room, and dining room.",
    expect: "Windows on two sides, garage accessible from exterior, 8+ rooms",
  },

  // ── With furniture ─────────────────────────────────────
  {
    id: "furnished-1bhk",
    prompt:
      "Design and furnish a 1-bedroom apartment (~600 sq ft) with a living room, kitchen, bathroom, and bedroom. Place appropriate furniture in each room.",
    expect: "Floor plan + furniture in every room, bed in bedroom, sofa in living room, toilet in bathroom",
  },

  // ── Multi-step / complex ───────────────────────────────
  {
    id: "office-floor",
    prompt:
      "Design an open-plan office floor (~2000 sq ft) with a reception/entrance, 4 private offices, a conference room, a break room with kitchenette, and 2 bathrooms.",
    expect: "10+ rooms, entrance near exterior, conference room centrally located",
  },
  {
    id: "restaurant",
    prompt:
      "Design a small restaurant layout (~1200 sq ft) with a dining area, kitchen, 2 bathrooms (one accessible), a storage room, and an entrance vestibule.",
    expect: "Kitchen near dining, bathrooms accessible from dining, storage near kitchen",
  },

  // ── Edge cases ─────────────────────────────────────────
  {
    id: "tiny-house",
    prompt: "Design a tiny house of exactly 200 sq ft with a bathroom, a kitchen, and a living/sleeping area.",
    expect: "Very compact, rooms meet minimum size requirements",
  },
  {
    id: "large-villa",
    prompt:
      "Design a luxury villa (4000 sq ft) with 5 bedrooms, 4 bathrooms, a grand foyer, formal living room, family room, gourmet kitchen, dining room, home office, laundry room, and 3-car garage.",
    expect: "12+ rooms, large plot, all rooms reachable via doors",
  },
];

export default prompts;
