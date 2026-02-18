# Test Prompts for All 10 New Skills

## Context
We implemented 10 new skills. The user needs a set of chat prompts to test each one end-to-end. Most skills require an existing floor plan, so the sequence matters — generate a floor plan first, then layer on additional skills.

## Test Sequence

### Step 1: Generate a base floor plan (prerequisite)

```
Design a 3-bedroom, 2-bathroom single-family home on a 50x40 plot. Include a living room, dining room, kitchen, hallway, entrance, and a garage. Add windows on all exterior walls for habitable rooms.
```

### Step 2: Add furniture (existing skill, good to verify still works)

```
Furnish this floor plan. Add beds and nightstands in all bedrooms, a sofa and TV stand in the living room, a dining table with chairs, kitchen counters with a refrigerator and stove, and toilet/sink/bathtub in the bathrooms.
```

### Step 3: Electrical layout

```
Add an electrical layout to this floor plan. Place outlets every 6 feet along walls, GFCI outlets in the kitchen and bathrooms, light switches near every door, ceiling lights in all rooms, recessed lights in the kitchen and hallway, and a smoke detector in each bedroom and the hallway. Put the electrical panel in the garage.
```

### Step 4: Plumbing layout

```
Add a plumbing layout. Place supply and drain lines in the bathrooms and kitchen, a water heater in the garage, and a main shutoff valve near the garage exterior wall. Add pipe runs connecting the water heater to the kitchen and both bathrooms.
```

### Step 5: Lighting plan

```
Create a detailed lighting plan. Add a chandelier over the dining table, recessed lights in the kitchen spaced 5 feet apart, ceiling lights in each bedroom, sconces flanking the bathroom mirrors, a pendant over the kitchen island area, and recessed lights in the hallway. Include coverage radius for each fixture.
```

### Step 6: HVAC layout

```
Add an HVAC system. Place supply vents below windows in each bedroom and the living room, return vents in the hallway, a furnace in the garage, a thermostat in the hallway, exhaust fans in both bathrooms and the kitchen, and an outdoor AC unit on the east side of the house. Add duct runs from the furnace to each vent.
```

### Step 7: Multi-story (staircases/elevators)

```
Add a staircase to this floor plan. Place it in the hallway, going up to a second floor. Make it a standard 4-foot wide, 10-foot long straight-run staircase with vertical orientation. Label this as the ground floor.
```

### Step 8: Landscaping

```
Add landscaping to the property. Put a driveway from the bottom edge to the garage, a walkway from the driveway to the front entrance, a patio behind the house near the living room, two large shade trees in the backyard, foundation shrubs along the front of the house, a lawn area in the front yard, and a small garden bed in the backyard.
```

### Step 9: Cost estimate

```
Generate a construction cost estimate for this house. Include site work, foundation, framing, roofing, siding, windows, doors, electrical, plumbing, HVAC, flooring, painting, kitchen cabinets and countertops, bathroom fixtures, and landscaping. Use standard US residential rates and add a 10% contingency.
```

### Step 10: Elevation view

```
Generate a south-facing front elevation view of this house. Show the foundation, main wall, roof with a gable shape, all windows and the front door visible from the south side. Assume 9-foot wall height and a 6-foot roof peak.
```

### Step 11: Style palette

```
Generate an interior design style palette for this house in a Modern Farmhouse style. Recommend flooring, wall colors, and accent colors for each room. Use warm whites and grays for walls, hardwood flooring in living areas, tile in wet rooms, and shiplap accents.
```

### Step 12: Annotations

```
Add annotations to the floor plan. Label the front entrance as "Main Entry", add a callout pointing to the master bedroom saying "Master Suite", add a dimension line showing the width of the living room, and add a note near the kitchen saying "Open concept layout".
```

## Quick Single-Prompt Tests (standalone, for rapid testing)

These test one skill at a time after you already have a floor plan:

- **Electrical**: `Add electrical outlets, switches, and ceiling lights to every room.`
- **Plumbing**: `Add plumbing fixtures and pipe runs to all wet rooms.`
- **Lighting**: `Design a lighting plan with proper lumen levels for each room.`
- **HVAC**: `Add heating and cooling vents, a furnace, and ductwork.`
- **Multi-story**: `Add a staircase in the hallway for a two-story layout.`
- **Landscaping**: `Add a driveway, front walkway, backyard patio, and trees.`
- **Cost estimate**: `How much would this house cost to build?`
- **Elevation**: `Show me the front elevation of this house.`
- **Style palette**: `Suggest a Scandinavian interior design palette for every room.`
- **Annotation**: `Label all rooms with their square footage and add a note about the open floor plan.`

## Verification
- Each prompt should trigger the correct tool call (visible in the chat response)
- Floor plan SVG should update after skills 3-8 and 12
- Cost estimate and style palette should render as cards in the chat
- Elevation view should be viewable via the "Elevation View" toggle button in the SVG panel
- No validation errors should block artifact creation (warnings are OK)
