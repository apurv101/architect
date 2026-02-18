import type { Skill } from "./types";
import type Anthropic from "@anthropic-ai/sdk";
import type { ToolHandler } from "../agent/types";

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

  /** Get all tool definitions to pass to the Claude API. */
  getAllTools(): Anthropic.Tool[] {
    const tools: Anthropic.Tool[] = [];
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
