import type { CanonicalTool, ToolDispatcher } from "../agent/providers/types";
import type { Artifact, ToolHandler } from "../agent/types";

/**
 * Metadata controlling how a skill is disclosed and when it is eligible.
 * Inspired by OpenClaw's SKILL.md frontmatter.
 */
export interface SkillMetadata {
  /** Display category for grouping */
  category?: "design" | "review" | "furnishing" | "systems";
  /**
   * If true, the full systemPrompt is injected into the system prompt
   * and tools are immediately available (no progressive disclosure).
   */
  always?: boolean;
  /**
   * Artifact kinds that must exist in the conversation for this skill
   * to be eligible. An empty array (or omitted) means always eligible.
   */
  requiresArtifacts?: Artifact["kind"][];
}

/**
 * A Skill is a self-contained capability the agent can use.
 * Each skill contributes tool schemas, handler functions,
 * and optionally system prompt additions.
 */
export interface Skill {
  /** Unique identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Provider-agnostic tool definitions */
  tools: CanonicalTool[];
  /** Map of tool_name → handler function */
  handlers: Record<string, ToolHandler>;
  /** Optional text appended to the system prompt when this skill is active */
  systemPrompt?: string;
  /** Metadata for filtering and progressive disclosure */
  metadata?: SkillMetadata;
}

/** Conversation context used for skill eligibility checks. */
export interface SkillContext {
  /** Artifact kinds produced so far in this conversation */
  availableArtifacts: Set<Artifact["kind"]>;
}

/** Snapshot produced by the registry for a single agent turn. */
export interface SkillSnapshot {
  /** Combined system prompt: base + always-skill prompts + <available_skills> XML */
  systemPrompt: string;
  /** All tools to register with the provider (always + gated + read_skill_instructions) */
  tools: CanonicalTool[];
  /** Wrapping dispatcher that enforces gating on non-always skills */
  toolHandler: ToolDispatcher;
}
