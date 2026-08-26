import assert from "node:assert/strict";
import { augmentAccessiblePages, canSeeSubsystem } from "./pageAccess";

const promptSubsystem = {
  id: "ai-analysis-prompts",
  win: "WinAiAnalysisPrompt",
  requiredRoleCodes: ["OWNER", "ADMIN_VENDOR"],
} as const;

assert.equal(
  canSeeSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "OWNER"),
  true,
);
assert.equal(
  canSeeSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "ADMIN_VENDOR"),
  true,
);
assert.equal(
  canSeeSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "MANAGER"),
  false,
);
assert.equal(
  augmentAccessiblePages(new Set(), "OWNER").has("nexterp.ai_analysis_prompts"),
  true,
);
