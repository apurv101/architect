import type { Skill, SkillContext, SkillSnapshot } from "./types";
import type { CanonicalTool, ToolDispatcher } from "../agent/providers/types";
import type { Artifact, ToolHandler, ToolHandlerContext } from "../agent/types";

/** Maps a tool name back to the skill that owns it. */
type ToolOwnerMap = Map<string, string>;

class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  /** Register a skill. Throws on duplicate skill names or tool name collisions. */
  register(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill "${skill.name}" is already registered`);
    }

    const existingToolNames = this.getToolNames();
    for (const tool of skill.tools) {
      if (existingToolNames.has(tool.name)) {
        throw new Error(
          `Tool "${tool.name}" from skill "${skill.name}" collides with an existing tool`
        );
      }
    }

    this.skills.set(skill.name, skill);
  }

  // ---------------------------------------------------------------------------
  // Snapshot builder (primary API)
  // ---------------------------------------------------------------------------

  /**
   * Build a snapshot for a single agent turn.
   *
   * 1. Filters skills by eligibility (requiresArtifacts satisfied).
   * 2. Splits eligible skills into "always" (active) vs "on-demand" (available).
   * 3. Builds the system prompt:
   *    - Base prompt
   *    - Full prompts for always-active skills
   *    - <available_skills> XML listing all eligible skills
   * 4. Builds the tool list: always tools + on-demand tools + read_skill_instructions
   * 5. Returns a gating ToolDispatcher that enforces read-before-use for on-demand skills.
   */
  buildSnapshot(
    basePrompt: string,
    context: SkillContext,
    handlerContext?: ToolHandlerContext,
    artifacts?: Artifact[]
  ): SkillSnapshot {
    const eligible = this.getEligibleSkills(context);
    const alwaysSkills: Skill[] = [];
    const onDemandSkills: Skill[] = [];

    for (const skill of eligible) {
      if (skill.metadata?.always) {
        alwaysSkills.push(skill);
      } else {
        onDemandSkills.push(skill);
      }
    }

    // --- System prompt ---
    const promptParts: string[] = [basePrompt];
    for (const skill of alwaysSkills) {
      if (skill.systemPrompt) {
        promptParts.push(skill.systemPrompt);
      }
    }
    promptParts.push(this.buildAvailableSkillsXml(alwaysSkills, onDemandSkills));
    const systemPrompt = promptParts.join("\n\n---\n\n");

    // --- Tools ---
    const tools: CanonicalTool[] = [];
    const toolOwners: ToolOwnerMap = new Map();

    for (const skill of eligible) {
      for (const tool of skill.tools) {
        tools.push(tool);
        toolOwners.set(tool.name, skill.name);
      }
    }

    // Add the meta-tool only if there are on-demand skills
    if (onDemandSkills.length > 0) {
      tools.push(this.getMetaTool(onDemandSkills));
    }

    // --- Gating dispatcher ---
    const loadedSkills = new Set<string>();
    const onDemandNames = new Set(onDemandSkills.map((s) => s.name));

    const toolHandler: ToolDispatcher = async (name, input) => {
      // Handle the meta-tool
      if (name === "read_skill_instructions") {
        return this.handleReadSkillInstructions(input, loadedSkills);
      }

      // Check gating for on-demand skills
      const ownerName = toolOwners.get(name);
      if (ownerName && onDemandNames.has(ownerName) && !loadedSkills.has(ownerName)) {
        return {
          content: `Error: You must call read_skill_instructions("${ownerName}") before using the "${name}" tool.`,
          isError: true,
        };
      }

      // Dispatch to the real handler
      const handler = this.getHandler(name);
      if (!handler) {
        return { content: `Error: Unknown tool "${name}"`, isError: true };
      }
      try {
        const result = await handler(input, handlerContext);
        if (result.artifact && artifacts) {
          artifacts.push(result.artifact);
        }
        return { content: result.content, isError: result.isError };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tool execution failed";
        return { content: `Error: ${msg}`, isError: true };
      }
    };

    return { systemPrompt, tools, toolHandler };
  }

  // ---------------------------------------------------------------------------
  // Eligibility
  // ---------------------------------------------------------------------------

  /** Returns skills whose requiresArtifacts are all present in context. */
  private getEligibleSkills(context: SkillContext): Skill[] {
    const eligible: Skill[] = [];
    for (const skill of this.skills.values()) {
      const required = skill.metadata?.requiresArtifacts;
      if (!required || required.length === 0) {
        eligible.push(skill);
        continue;
      }
      if (required.every((kind) => context.availableArtifacts.has(kind))) {
        eligible.push(skill);
      }
    }
    return eligible;
  }

  // ---------------------------------------------------------------------------
  // Meta-tool: read_skill_instructions
  // ---------------------------------------------------------------------------

  /** Builds the read_skill_instructions CanonicalTool definition. */
  private getMetaTool(onDemandSkills: Skill[]): CanonicalTool {
    const skillNames = onDemandSkills.map((s) => s.name);
    return {
      name: "read_skill_instructions",
      description:
        "Load the full instructions for a skill before using its tools. " +
        "You MUST call this before using any tool from an 'available' skill.",
      input_schema: {
        type: "object",
        properties: {
          skill_name: {
            type: "string",
            description: `The name of the skill to load. Available: ${skillNames.join(", ")}`,
            enum: skillNames,
          },
        },
        required: ["skill_name"],
      },
    };
  }

  /** Handles a read_skill_instructions call: marks skill loaded, returns prompt. */
  private handleReadSkillInstructions(
    input: unknown,
    loadedSkills: Set<string>
  ): { content: string; isError?: boolean } {
    const skillName = (input as { skill_name?: string })?.skill_name;
    if (!skillName) {
      return { content: "Error: skill_name is required", isError: true };
    }

    const skill = this.skills.get(skillName);
    if (!skill) {
      return { content: `Error: Unknown skill "${skillName}"`, isError: true };
    }

    loadedSkills.add(skillName);

    const toolNames = skill.tools.map((t) => t.name).join(", ");
    const instructions = skill.systemPrompt ?? "(No additional instructions for this skill.)";

    return {
      content:
        `# Skill "${skillName}" loaded\n\n` +
        `Available tools: ${toolNames}\n\n` +
        `## Instructions\n\n${instructions}`,
    };
  }

  // ---------------------------------------------------------------------------
  // XML prompt section
  // ---------------------------------------------------------------------------

  private buildAvailableSkillsXml(
    alwaysSkills: Skill[],
    onDemandSkills: Skill[]
  ): string {
    if (alwaysSkills.length === 0 && onDemandSkills.length === 0) {
      return "";
    }

    const lines: string[] = [
      "## Available Skills",
      "",
      "Before replying, scan the skills below. For skills with status=\"available\", " +
        "call read_skill_instructions with the skill name before using their tools.",
      "",
      "<available_skills>",
    ];

    for (const skill of alwaysSkills) {
      const toolNames = skill.tools.map((t) => t.name).join(", ");
      lines.push(`  <skill name="${skill.name}" status="active">`);
      lines.push(`    <description>${skill.description}</description>`);
      lines.push(`    <tools>${toolNames}</tools>`);
      lines.push(`  </skill>`);
    }

    for (const skill of onDemandSkills) {
      lines.push(`  <skill name="${skill.name}" status="available">`);
      lines.push(`    <description>${skill.description}</description>`);
      lines.push(
        `    <!-- Tools hidden — call read_skill_instructions("${skill.name}") to unlock -->`
      );
      lines.push(`  </skill>`);
    }

    lines.push("</available_skills>");
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Low-level lookups (kept for backward compatibility)
  // ---------------------------------------------------------------------------

  /** Get all tool definitions (provider-agnostic). */
  getAllTools(): CanonicalTool[] {
    const tools: CanonicalTool[] = [];
    for (const skill of this.skills.values()) {
      tools.push(...skill.tools);
    }
    return tools;
  }

  /** Build the combined system prompt: base prompt + all skill additions. */
  buildSystemPrompt(basePrompt: string): string {
    const additions: string[] = [];
    for (const skill of this.skills.values()) {
      if (skill.systemPrompt) {
        additions.push(skill.systemPrompt);
      }
    }
    if (additions.length === 0) return basePrompt;
    return [basePrompt, ...additions].join("\n\n---\n\n");
  }

  /** Look up the handler for a given tool name. */
  getHandler(toolName: string): ToolHandler | undefined {
    for (const skill of this.skills.values()) {
      if (toolName in skill.handlers) {
        return skill.handlers[toolName];
      }
    }
    return undefined;
  }

  private getToolNames(): Set<string> {
    const names = new Set<string>();
    for (const skill of this.skills.values()) {
      for (const tool of skill.tools) {
        names.add(tool.name);
      }
    }
    return names;
  }
}

export const registry = new SkillRegistry();
