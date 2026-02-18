# Repository Guidelines

AI-powered architectural floor plan generator with furniture layout. Users describe a building in natural language (or upload an image), an LLM generates structured JSON via tool calls, and the app renders an interactive SVG floor plan.

- Stack: React 19, TypeScript, Vite 7, Tailwind CSS v4
- LLM providers: Anthropic Claude (`claude-sonnet-4-20250514`), OpenAI GPT (`gpt-4o`), Google Gemini (`gemini-2.0-flash`)
- No backend — API keys are stored in `localStorage` and calls go direct from browser

## Project Structure

```
src/
├── agent/                    # Agent orchestration
│   ├── agent.ts              # Agentic loop: user message → provider → tool calls → artifacts
│   ├── types.ts              # Artifact, ToolHandler, AgentConfig, AgentResult
│   └── providers/            # LLM provider adapters
│       ├── index.ts          # ADAPTERS + PROVIDER_CONFIGS registry
│       ├── types.ts          # CanonicalTool, ProviderAdapter, ToolDispatcher interfaces
│       ├── anthropic.ts      # Claude adapter
│       ├── openai.ts         # GPT adapter
│       └── gemini.ts         # Gemini adapter
├── skills/                   # Extensible tool/skill system
│   ├── types.ts              # Skill interface
│   ├── registry.ts           # SkillRegistry singleton (tool lookup, prompt building)
│   ├── index.ts              # Registers all skills, exports registry
│   ├── floor-plan/           # Floor plan generation skill
│   │   ├── index.ts          # Validation + handler (generate_floor_plan tool)
│   │   ├── schema.ts         # JSON Schema for tool input
│   │   └── prompt.ts         # System prompt addition for architectural design
│   └── furniture-layout/     # Furniture placement skill
│       ├── index.ts          # Validation + handler (furnish_floor_plan tool)
│       ├── schema.ts         # JSON Schema for tool input
│       └── prompt.ts         # System prompt addition for interior design
├── components/               # React UI
│   ├── App.tsx               # Root layout, provider/key state, two-pane layout
│   ├── ChatPanel.tsx         # Chat UI with image upload, auto-scroll
│   ├── ChatMessage.tsx       # Single message bubble
│   ├── FloorPlanPanel.tsx    # SVG viewer with zoom controls + download
│   ├── FloorPlanSVG.tsx      # Main SVG renderer (grid, rooms, walls, doors, etc.)
│   ├── RoomRect.tsx          # Room fill, hatching for wet rooms, labels
│   ├── FurnitureRect.tsx     # Furniture item with rotation + icon
│   ├── FurnitureIcons.tsx    # 25 SVG icon shapes by furniture type
│   ├── WallRenderer.tsx      # Edge merging, exterior/interior wall thickness
│   ├── DoorMarker.tsx        # Door leaf + quarter-circle swing arc
│   ├── WindowMarker.tsx      # Window symbol (parallel lines)
│   ├── DimensionLines.tsx    # Dimension annotations with tick marks
│   ├── ProviderSelect.tsx    # Provider dropdown
│   └── ApiKeyInput.tsx       # API key input with localStorage persistence
├── hooks/
│   └── useChat.ts            # Chat state, agent integration, artifact extraction
├── lib/
│   ├── types.ts              # Domain model: Room, Door, Window, FurnitureItem, FloorPlan, Plot
│   ├── colors.ts             # Room and furniture color palettes
│   └── image.ts              # File → base64 conversion (PNG/JPEG/WEBP/GIF, max 10MB)
├── main.tsx                  # React entry point
└── index.css                 # Base Tailwind styles
```

## Build & Development

- Install: `npm install`
- Dev server: `npm run dev` (Vite HMR)
- Build: `npm run build` (TypeScript check + Vite production build)
- Lint: `npm run lint` (ESLint)
- Preview: `npm run preview`
- No test framework is set up yet.

## Architecture

### Agent Loop (`src/agent/agent.ts`)

```
User message + images → runAgent() → ProviderAdapter.runAgentLoop()
  → LLM generates tool calls → SkillRegistry dispatches to handlers
  → Handlers validate + return artifacts → loop until LLM stops calling tools
  → Return { text, artifacts[], messages[] }
```

- Provider adapters normalize API differences (message format, tool schema conversion, tool call parsing).
- `messages` is an opaque `unknown[]` ref in provider-native format. Resets when provider changes.
- Max 10 tool dispatch rounds per turn (configurable via `maxToolRounds`).
- Tool handlers return `ToolHandlerResult` with optional `Artifact`. Validation errors are sent back to the LLM which auto-corrects and retries.

### Skill System (`src/skills/`)

Each skill is a directory with `index.ts`, `schema.ts`, `prompt.ts`:

- **`Skill` interface**: `name`, `description`, `tools: CanonicalTool[]`, `handlers: Record<string, ToolHandler>`, optional `systemPrompt`
- **Registry** (`registry.ts`): singleton, validates no tool name collisions, builds combined system prompt (`base + "\n\n---\n\n" + skill additions`)
- **Registration**: all skills registered in `src/skills/index.ts`

Current skills:
| Skill | Tool name | What it does |
|-------|-----------|-------------|
| `floor-plan` | `generate_floor_plan` | Generates room layouts with doors, windows. Validates bounds, overlaps, min dimensions, aspect ratios, door placement. |
| `furniture-layout` | `furnish_floor_plan` | Places furniture in rooms. Validates room-type appropriateness, bounds, overlaps, door clearance (3ft), bed clearance (2ft). |

### Provider Adapters (`src/agent/providers/`)

All adapters implement `ProviderAdapter` with a single method `runAgentLoop()`. Each handles:
1. Converting `CanonicalTool[]` to provider-specific tool format
2. Formatting user messages (text + images) in provider-native format
3. Parsing tool calls from provider response
4. Managing conversation history in provider-native format

Registered in `ADAPTERS` and `PROVIDER_CONFIGS` maps in `src/agent/providers/index.ts`.

## Domain Model (`src/lib/types.ts`)

- **Coordinate system**: top-left origin, X rightward, Y downward, units in feet
- **SVG scale**: 1 foot = 10 pixels
- **RoomType**: `bedroom | bathroom | kitchen | living_room | dining_room | hallway | garage | balcony | utility | entrance | other`
- **FurnitureType**: 20 types (`bed`, `nightstand`, `dresser`, `desk`, `chair`, `sofa`, `coffee_table`, `dining_table`, `dining_chair`, `tv_stand`, `bookshelf`, `wardrobe`, `toilet`, `sink`, `bathtub`, `shower`, `kitchen_counter`, `refrigerator`, `stove`, `washing_machine`)
- **FloorPlan**: `{ plot, rooms[], doors[], windows?, furniture?, notes }`
- **Artifact**: discriminated union — currently only `{ kind: "floor_plan", data: FloorPlan }`

## SVG Rendering (`src/components/FloorPlanSVG.tsx`)

Render order (back to front): grid background → rooms → furniture → walls → doors → windows → dimension lines → legend

- **Rooms**: pastel fill by type, diagonal hatching for wet rooms (bathroom, kitchen), centered labels with area
- **Walls**: edge-merging algorithm deduplicates shared edges; exterior = 5px, interior = 3px; splits at door/window openings
- **Doors**: solid leaf line + quarter-circle swing arc; direction from `swingDirection` + room center proximity
- **Windows**: two parallel lines with end caps, clears wall background
- **Furniture**: color by type, SVG icons from `FurnitureIcons.tsx`, rotation support (0/90/180/270 — swaps effective width/height)
- **Dimensions**: horizontal + vertical chains showing room breakdown + overall plot

## Adding a New Skill

1. Create `src/skills/<name>/` with three files:
   - `schema.ts` — JSON Schema for the tool's input
   - `prompt.ts` — system prompt addition (architectural/design guidance + few-shot examples)
   - `index.ts` — implements `Skill` interface with validation + handler
2. Handler receives parsed input, validates, returns `ToolHandlerResult` with optional `Artifact`
3. Add new artifact kinds to `src/agent/types.ts` (`Artifact` union type)
4. Register in `src/skills/index.ts`: `registry.register(yourSkill)`
5. Validation errors should be descriptive — the LLM reads them to self-correct

## Adding a New Provider

1. Create `src/agent/providers/<name>.ts` implementing `ProviderAdapter`
2. Add provider ID to `ProviderId` union in `src/agent/providers/types.ts`
3. Add config entry in `PROVIDER_CONFIGS` and adapter in `ADAPTERS` (both in `src/agent/providers/index.ts`)
4. Handle: message formatting, tool schema conversion, tool call parsing, image attachment encoding

## Coding Conventions

- TypeScript strict mode. Avoid `any`.
- Functional React components with hooks. No class components.
- Tailwind utility classes for all styling. Colors defined in `src/lib/colors.ts`.
- Skill handlers: validate early, return descriptive error messages. Hard errors block artifact creation; warnings pass through.
- Provider adapters: keep the interface consistent. Each adapter is self-contained with no cross-adapter imports.
- SVG components: pure rendering, no side effects. Accept data via props.
- Image uploads: validate type and size in `src/lib/image.ts` before sending to agent.
