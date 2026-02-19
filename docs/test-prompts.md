# Test Prompts for the 5-Step Pipeline

Use these prompts to verify the full `plan_rooms → analyze_site → place_rooms → finalize_floor_plan → review_floor_plan` pipeline.

---

## Basic

### 1. Small apartment
> Design a 1-bedroom apartment with an open kitchen and living area, about 600 sqft.

**What to check:** Minimal room count, open-plan zoning, all 5 steps complete.

### 2. Standard 2-bedroom house
> Create a 2-bedroom, 1-bathroom house on a 40x30 ft plot. Include a kitchen, living room, and dining room.

**What to check:** Zoning separates public/private, hallway connects zones, all adjacencies satisfied.

### 3. Family home
> Design a 3-bedroom, 2-bathroom family home on a 50x40 ft plot. The master bedroom should have its own bathroom. Include a garage.

**What to check:** En-suite adjacency, garage on exterior, private zone separation, kitchen-dining adjacency.

---

## Site constraints

### 4. Orientation-aware design
> Build a 3-bedroom house on a 45x35 ft plot. The north side is at the top. I want the living room to get maximum afternoon sun.

**What to check:** `analyze_site` picks south-facing edge for living room, preferred windows reflect orientation.

### 5. Narrow lot
> Design a 2-bedroom house on a narrow 20x50 ft lot. Entry from the left side.

**What to check:** Corridor/linear circulation strategy, rooms stack vertically, aspect ratio limits respected.

### 6. Setbacks
> Create a 3-bedroom house on a 60x40 ft plot with 5ft setbacks on all sides. Include a utility room.

**What to check:** `analyze_site` records setbacks, rooms fit within usable 50x30 interior.

---

## Complex layouts

### 7. Large house with many rooms
> Design a 4-bedroom, 3-bathroom house with a home office, utility room, and double garage. Plot is 70x50 ft. Master suite should be isolated from the kids' bedrooms.

**What to check:** Zone separation (master vs other bedrooms), service zone handles garage + utility, review catches any privacy issues.

### 8. Multi-zone separation
> I need a house with separate guest quarters. 2 bedrooms for the family on one side, and 1 guest bedroom with its own bathroom on the other side. 45x40 ft plot.

**What to check:** Private zone splits into two regions, circulation strategy addresses the separation.

---

## Edge cases & error recovery

### 9. Tight fit (triggers retries)
> Put 4 bedrooms, 2 bathrooms, a kitchen, living room, dining room, and hallway on a 35x30 ft plot.

**What to check:** `plan_rooms` may warn about tight area coverage, LLM adjusts room sizes. May trigger place_rooms retries due to overlaps.

### 10. Ambiguous request
> Make me a nice house.

**What to check:** LLM should ask clarifying questions (how many bedrooms, plot size, etc.) rather than guessing.

### 11. Modification after generation
> First: "Design a 2-bedroom house on a 40x30 plot."
> Then: "Make the kitchen bigger and add a balcony."

**What to check:** Full 5-step pipeline re-runs from plan_rooms. New room (balcony) added, kitchen area increased.

---

## Review-focused

### 12. Privacy violation trigger
> Design a 2-bedroom house where the bathroom is between the kitchen and dining room.

**What to check:** `review_floor_plan` flags BATHROOM_TO_KITCHEN or BATHROOM_TO_PUBLIC. LLM should fix and re-review.

### 13. Reachability issue
> Create a house with a bedroom that can only be reached through another bedroom.

**What to check:** Review catches BEDROOM_THROUGH_BEDROOM or UNREACHABLE_ROOM. LLM should add a hallway connection.

---

## Quick smoke tests

Copy-paste any of these for a fast check:

```
Design a 2-bedroom, 1-bathroom house on a 35x30 ft plot.
```

```
3-bedroom family home with garage, 50x40 ft plot, entry from the bottom.
```

```
Small studio apartment, 25x20 ft, open plan with a bathroom.
```
