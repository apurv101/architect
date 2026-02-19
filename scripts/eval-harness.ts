#!/usr/bin/env tsx
/**
 * Eval Harness — runs a list of prompts through the agent and reports results.
 *
 * Usage:
 *   npm run eval                                   # run with default provider (anthropic)
 *   npm run eval -- --provider openai              # use a specific provider
 *   npm run eval -- --max-attempts 5               # retry up to 5 times per prompt
 *   npm run eval -- --only studio-apartment        # run a single prompt by id
 *   npm run eval -- --only studio-apartment,2bhk   # run multiple by id
 *
 * Requires environment variable:
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
 */

import { runAgent } from "../src/agent/agent";
import type { AgentConfig, Artifact } from "../src/agent/types";
import type { ProviderId } from "../src/agent/providers/types";
import type { FloorPlan } from "../src/lib/types";
import { reviewFloorPlan, type ReviewResult } from "../src/lib/review";
import prompts from "./prompts";
import type { EvalPrompt } from "./prompts";
import { renderFloorPlanSVG } from "./svg-renderer";
import * as fs from "node:fs";
import * as path from "node:path";

// ── CLI arg parsing ──────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let provider: ProviderId = "anthropic";
  let only: string[] | null = null;
  let maxAttempts = 3;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) {
      provider = args[++i] as ProviderId;
    } else if (args[i] === "--only" && args[i + 1]) {
      only = args[++i].split(",").map((s) => s.trim());
    } else if (args[i] === "--max-attempts" && args[i + 1]) {
      maxAttempts = Math.max(1, parseInt(args[++i], 10) || 3);
    }
  }

  return { provider, only, maxAttempts };
}

// ── API key lookup ───────────────────────────────────────

const API_KEY_ENV: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};

function getApiKey(provider: ProviderId): string {
  const envVar = API_KEY_ENV[provider];
  const key = process.env[envVar];
  if (!key) {
    console.error(`\n  Missing ${envVar} environment variable.`);
    console.error(`  Set it before running:  export ${envVar}=your-key-here\n`);
    process.exit(1);
  }
  return key;
}

// ── Result types ─────────────────────────────────────────

interface EvalResult {
  id: string;
  prompt: string;
  expect?: string;
  provider: ProviderId;
  durationMs: number;
  status: "pass" | "error";
  error?: string;
  warnings: string[];
  response: string;
  artifacts: ArtifactSummary[];
  floorPlan?: FloorPlanSummary;
  reviewResult?: ReviewResult;
  /** Raw FloorPlan for SVG rendering (excluded from JSON output) */
  floorPlanData?: FloorPlan;
  /** Number of agent turns used (1 = first attempt, >1 = retried on review issues) */
  attempts?: number;
}

interface ArtifactSummary {
  kind: string;
}

interface FloorPlanSummary {
  plotWidth: number;
  plotHeight: number;
  plotArea: number;
  roomCount: number;
  rooms: { name: string; type: string; area: number }[];
  doorCount: number;
  windowCount: number;
}

// ── Summarize a floor plan ───────────────────────────────

function summarizeFloorPlan(fp: FloorPlan): FloorPlanSummary {
  return {
    plotWidth: fp.plot.width,
    plotHeight: fp.plot.height,
    plotArea: fp.plot.area,
    roomCount: fp.rooms.length,
    rooms: fp.rooms.map((r) => ({
      name: r.name,
      type: r.type,
      area: Math.round(r.width * r.height),
    })),
    doorCount: fp.doors.length,
    windowCount: (fp.windows ?? []).length,
  };
}

// ── Run a single prompt (LIVE via LLM) ──────────────────
//
// Outer retry loop: after the agent produces a floor plan, we run the
// architectural review.  If there are ANY issues (critical, warning, or
// suggestion), we send the review feedback as a follow-up user message
// and run another agent turn — with full conversation history so the LLM
// can learn from its previous attempts.
//
// The *inner* agent loop (maxToolRounds) already retries on critical
// issues inside the tool handler.  The outer loop here pushes the LLM
// to also fix non-critical warnings and suggestions across multiple turns.

async function runLiveEval(
  evalPrompt: EvalPrompt,
  config: AgentConfig,
  maxAttempts: number
): Promise<EvalResult> {
  const messages: unknown[] = [];
  const start = Date.now();
  let attempts = 0;
  let bestFloorPlan: FloorPlan | undefined;
  let bestReview: ReviewResult | undefined;
  let lastResponseText = "";

  try {
    // ── First attempt with the original prompt ──
    let result = await runAgent(config, messages, evalPrompt.prompt);
    attempts++;
    lastResponseText = result.text;

    // Take the last floor_plan artifact produced in this turn
    let fpArtifact = [...result.artifacts]
      .reverse()
      .find((a: Artifact) => a.kind === "floor_plan");

    if (fpArtifact) {
      bestFloorPlan = fpArtifact.data as FloorPlan;
      bestReview = reviewFloorPlan(bestFloorPlan);
    }

    // ── Outer retry loop ──
    while (
      bestFloorPlan &&
      bestReview &&
      bestReview.issues.length > 0 &&
      attempts < maxAttempts
    ) {
      const issueList = bestReview.issues
        .map(
          (issue, idx) =>
            `${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`
        )
        .join("\n");

      const retryMessage =
        `The floor plan you generated has ${bestReview.issues.length} architectural review issue(s):\n\n` +
        `${issueList}\n\n` +
        `Please redesign the floor plan to fix ALL of these issues. ` +
        `Call the finalize_floor_plan tool with an improved layout.`;

      console.log(
        `    ${DIM}Review found ${bestReview.issues.length} issue(s) — retrying (attempt ${attempts + 1}/${maxAttempts})...${RESET}`
      );

      result = await runAgent(config, messages, retryMessage);
      attempts++;
      lastResponseText = result.text;

      fpArtifact = [...result.artifacts]
        .reverse()
        .find((a: Artifact) => a.kind === "floor_plan");

      if (fpArtifact) {
        const newFp = fpArtifact.data as FloorPlan;
        const newReview = reviewFloorPlan(newFp);

        // Always use the latest result (it has the most context)
        bestFloorPlan = newFp;
        bestReview = newReview;
      } else {
        // LLM didn't produce a floor plan this round — stop retrying
        break;
      }
    }

    const durationMs = Date.now() - start;

    return {
      id: evalPrompt.id,
      prompt: evalPrompt.prompt,
      expect: evalPrompt.expect,

      provider: config.provider,
      durationMs,
      status: "pass",
      warnings: [],
      response: lastResponseText,
      artifacts: bestFloorPlan ? [{ kind: "floor_plan" }] : [],
      floorPlan: bestFloorPlan ? summarizeFloorPlan(bestFloorPlan) : undefined,
      floorPlanData: bestFloorPlan,
      reviewResult: bestReview,
      attempts,
    };
  } catch (err) {
    return {
      id: evalPrompt.id,
      prompt: evalPrompt.prompt,
      expect: evalPrompt.expect,

      provider: config.provider,
      durationMs: Date.now() - start,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      warnings: [],
      response: "",
      artifacts: [],
      attempts,
    };
  }
}

// ── Console output helpers ───────────────────────────────

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function printHeader(mode: string, count: number) {
  console.log(
    `\n${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}`
  );
  console.log(
    `${BOLD}║  Eval Harness — ${count} prompt(s), ${mode}${" ".repeat(Math.max(0, 32 - mode.length - String(count).length))}║${RESET}`
  );
  console.log(
    `${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`
  );
}

function printResult(result: EvalResult, index: number, total: number) {
  const statusIcon =
    result.status === "pass" ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const duration = (result.durationMs / 1000).toFixed(1);

  const attemptsLabel = result.attempts && result.attempts > 1 ? ` ${CYAN}${result.attempts} attempts${RESET}` : "";
  console.log(
    `${BOLD}[${index + 1}/${total}]${RESET} ${statusIcon} ${BOLD}${result.id}${RESET} ${DIM}(${duration}s)${RESET}${attemptsLabel}`
  );
  console.log(`  ${DIM}Prompt:${RESET} ${result.prompt.slice(0, 80)}${result.prompt.length > 80 ? "..." : ""}`);

  if (result.status === "error") {
    console.log(`  ${RED}Error: ${result.error}${RESET}`);
  }

  if (result.floorPlan) {
    const fp = result.floorPlan;
    console.log(
      `  ${CYAN}Floor Plan:${RESET} ${fp.plotWidth}×${fp.plotHeight}ft (${fp.plotArea} sq ft)`
    );
    console.log(
      `    Rooms: ${fp.roomCount} | Doors: ${fp.doorCount} | Windows: ${fp.windowCount}`
    );
    console.log(
      `    ${fp.rooms.map((r) => `${r.name} [${r.type}] ${r.area}sqft`).join(", ")}`
    );
  }

  if (result.reviewResult) {
    const r = result.reviewResult;
    const reviewColor = r.passed ? GREEN : RED;
    console.log(`  ${reviewColor}Review: ${r.summary}${RESET}`);
    for (const issue of r.issues) {
      const sevColor =
        issue.severity === "critical"
          ? RED
          : issue.severity === "warning"
            ? YELLOW
            : DIM;
      console.log(
        `    ${sevColor}[${issue.severity}] ${issue.code}: ${issue.message}${RESET}`
      );
    }
  }

  if (result.warnings.length > 0) {
    console.log(`  ${YELLOW}Warnings (${result.warnings.length}):${RESET}`);
    for (const w of result.warnings) {
      console.log(`    ${YELLOW}• ${w}${RESET}`);
    }
  }

  if (result.expect) {
    console.log(`  ${DIM}Expected:${RESET} ${result.expect}`);
  }

  if (result.status !== "error" && result.response) {
    const responsePreview = result.response.replace(/\n/g, " ").slice(0, 120);
    console.log(`  ${DIM}Response: ${responsePreview}${result.response.length > 120 ? "..." : ""}${RESET}`);
  }

  console.log();
}

function printSummary(results: EvalResult[]) {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "error").length;
  const withFloorPlan = results.filter((r) => r.floorPlan).length;
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  const reviewClean = results.filter(
    (r) => r.reviewResult && r.reviewResult.passed
  ).length;
  const reviewWithIssues = results.filter(
    (r) => r.reviewResult && !r.reviewResult.passed
  ).length;

  console.log(
    `${BOLD}────────────────────────────────────────────────────────────────${RESET}`
  );
  console.log(`${BOLD}Summary${RESET}`);
  console.log(
    `  ${GREEN}Passed: ${passed}${RESET}  ${failed > 0 ? `${RED}Failed: ${failed}${RESET}  ` : ""}${CYAN}Floor plans: ${withFloorPlan}${RESET}  ${totalWarnings > 0 ? `${YELLOW}Warnings: ${totalWarnings}${RESET}  ` : ""}${DIM}Total: ${(totalDuration / 1000).toFixed(1)}s${RESET}`
  );
  if (reviewClean + reviewWithIssues > 0) {
    console.log(
      `  ${GREEN}Review clean: ${reviewClean}${RESET}  ${reviewWithIssues > 0 ? `${RED}Review issues: ${reviewWithIssues}${RESET}` : ""}`
    );
  }
  console.log();
}

// ── HTML report generation ───────────────────────────────

function generateHtmlReport(results: EvalResult[], modeLabel: string): string {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "error").length;
  const timestamp = new Date().toLocaleString();

  const cards = results
    .map((r) => {
      const statusColor = r.status === "pass" ? "#22c55e" : "#ef4444";
      const statusLabel = r.status === "pass" ? "PASS" : "FAIL";

      const svgBlock = r.floorPlanData
        ? `<div class="svg-container">${renderFloorPlanSVG(r.floorPlanData)}</div>`
        : `<div class="no-svg">No floor plan data</div>`;

      const warningsBlock =
        r.warnings.length > 0
          ? `<div class="warnings"><strong>Warnings (${r.warnings.length}):</strong><ul>${r.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`
          : "";

      const errorBlock = r.error
        ? `<div class="error-detail"><strong>Error:</strong> <pre>${esc(r.error)}</pre></div>`
        : "";

      const roomsTable = r.floorPlan
        ? `<table class="rooms-table">
            <tr><th>Room</th><th>Type</th><th>Area</th></tr>
            ${r.floorPlan.rooms.map((rm) => `<tr><td>${esc(rm.name)}</td><td>${rm.type}</td><td>${rm.area} sqft</td></tr>`).join("")}
          </table>`
        : "";

      const statsLine = r.floorPlan
        ? `<div class="stats">${r.floorPlan.plotWidth}&times;${r.floorPlan.plotHeight}ft &middot; ${r.floorPlan.roomCount} rooms &middot; ${r.floorPlan.doorCount} doors &middot; ${r.floorPlan.windowCount} windows</div>`
        : "";

      const reviewBlock = r.reviewResult
        ? `<div class="review ${r.reviewResult.passed ? "review-pass" : "review-fail"}">
            <strong>Architectural Review:</strong> ${esc(r.reviewResult.summary)}
            ${r.reviewResult.issues.length > 0
              ? `<ul>${r.reviewResult.issues.map((i) => `<li class="review-${i.severity}">[${i.severity.toUpperCase()}] ${esc(i.code)}: ${esc(i.message)}</li>`).join("")}</ul>`
              : ""}
          </div>`
        : "";

      const attemptsBadge = r.attempts && r.attempts > 1
        ? `<span class="attempts">${r.attempts} attempts</span>`
        : "";

      return `
      <div class="card">
        <div class="card-header">
          <span class="status" style="background:${statusColor}">${statusLabel}</span>
          <h2>${esc(r.id)}</h2>
          ${attemptsBadge}
          <span class="duration">${(r.durationMs / 1000).toFixed(1)}s</span>
        </div>
        <div class="prompt">${esc(r.prompt)}</div>
        ${r.expect ? `<div class="expect"><strong>Expected:</strong> ${esc(r.expect)}</div>` : ""}
        ${errorBlock}
        ${reviewBlock}
        ${warningsBlock}
        ${statsLine}
        <div class="card-body">
          ${svgBlock}
          ${roomsTable}
        </div>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Eval Report — ${esc(modeLabel)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
  .header { text-align: center; margin-bottom: 2rem; }
  .header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .header .meta { color: #64748b; font-size: 0.875rem; }
  .summary { display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 2rem; flex-wrap: wrap; }
  .summary .pill { padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; }
  .pill-pass { background: #dcfce7; color: #166534; }
  .pill-fail { background: #fecaca; color: #991b1b; }
  .pill-total { background: #e0e7ff; color: #3730a3; }
  .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; overflow: hidden; }
  .card-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; }
  .card-header h2 { font-size: 1.1rem; flex: 1; }
  .status { color: white; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 4px; text-transform: uppercase; }
  .duration { color: #94a3b8; font-size: 0.8rem; }
  .attempts { background: #e0e7ff; color: #3730a3; font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; }
  .prompt { padding: 0.75rem 1.25rem; color: #475569; font-size: 0.9rem; border-bottom: 1px solid #f1f5f9; }
  .expect { padding: 0.5rem 1.25rem; color: #64748b; font-size: 0.85rem; font-style: italic; }
  .error-detail { padding: 0.75rem 1.25rem; background: #fef2f2; }
  .error-detail pre { white-space: pre-wrap; font-size: 0.8rem; color: #991b1b; margin-top: 0.25rem; }
  .warnings { padding: 0.75rem 1.25rem; background: #fffbeb; }
  .warnings ul { margin-left: 1.25rem; margin-top: 0.25rem; }
  .warnings li { font-size: 0.8rem; color: #92400e; }
  .stats { padding: 0.5rem 1.25rem; color: #64748b; font-size: 0.85rem; }
  .card-body { display: flex; gap: 1rem; padding: 1rem 1.25rem; flex-wrap: wrap; align-items: flex-start; }
  .svg-container { flex: 1; min-width: 300px; overflow: auto; }
  .svg-container svg { max-width: 100%; height: auto; }
  .no-svg { flex: 1; min-width: 300px; display: flex; align-items: center; justify-content: center; height: 150px; background: #f1f5f9; border-radius: 8px; color: #94a3b8; }
  .rooms-table { border-collapse: collapse; font-size: 0.8rem; }
  .rooms-table th, .rooms-table td { padding: 0.35rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
  .rooms-table th { font-weight: 600; color: #64748b; }
  .review { padding: 0.75rem 1.25rem; }
  .review-pass { background: #f0fdf4; }
  .review-fail { background: #fef2f2; }
  .review ul { margin-left: 1.25rem; margin-top: 0.25rem; list-style: none; }
  .review li { font-size: 0.8rem; margin-bottom: 0.15rem; }
  .review li::before { content: ""; }
  .review li.review-critical { color: #991b1b; }
  .review li.review-warning { color: #92400e; }
  .review li.review-suggestion { color: #64748b; }
</style>
</head>
<body>
  <div class="header">
    <h1>Eval Report</h1>
    <div class="meta">${esc(modeLabel)} &middot; ${esc(timestamp)}</div>
  </div>
  <div class="summary">
    <span class="pill pill-total">${results.length} total</span>
    <span class="pill pill-pass">${passed} passed</span>
    ${failed > 0 ? `<span class="pill pill-fail">${failed} failed</span>` : ""}
  </div>
  ${cards}
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const { provider, only, maxAttempts } = parseArgs();

  // Filter prompts
  let selectedPrompts = prompts;
  if (only) {
    selectedPrompts = prompts.filter((p) => only.includes(p.id));
    const missing = only.filter((id) => !prompts.find((p) => p.id === id));
    if (missing.length > 0) {
      console.error(`\n  Unknown prompt id(s): ${missing.join(", ")}`);
      console.error(`  Available: ${prompts.map((p) => p.id).join(", ")}\n`);
      process.exit(1);
    }
  }

  if (selectedPrompts.length === 0) {
    console.error("\n  No prompts to run.\n");
    process.exit(1);
  }

  const modeLabel = `${provider.toUpperCase()}, max ${maxAttempts} attempt(s)`;
  printHeader(modeLabel, selectedPrompts.length);

  const apiKey = getApiKey(provider);
  const config: AgentConfig = {
    apiKey,
    provider,
    maxToolRounds: 12,
  };

  const results: EvalResult[] = [];

  for (let i = 0; i < selectedPrompts.length; i++) {
    const evalPrompt = selectedPrompts[i];
    console.log(
      `${DIM}Running [${i + 1}/${selectedPrompts.length}]: ${evalPrompt.id}...${RESET}`
    );
    const result = await runLiveEval(evalPrompt, config, maxAttempts);
    results.push(result);
    printResult(result, i, selectedPrompts.length);
  }

  printSummary(results);

  // Save results to disk
  const outDir = path.join(import.meta.dirname, "results");
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // JSON (exclude floorPlanData to keep file small)
  const jsonResults = results.map(({ floorPlanData: _, ...rest }) => rest);
  const jsonFile = path.join(outDir, `eval-${provider}-${timestamp}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(jsonResults, null, 2));
  console.log(`${DIM}JSON saved to ${jsonFile}${RESET}`);

  // HTML report with SVG floor plan drawings
  const htmlFile = path.join(outDir, `eval-${provider}-${timestamp}.html`);
  fs.writeFileSync(htmlFile, generateHtmlReport(results, modeLabel));
  console.log(`${DIM}HTML report saved to ${htmlFile}${RESET}`);
  console.log(`${CYAN}Open in browser: file://${htmlFile}${RESET}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
