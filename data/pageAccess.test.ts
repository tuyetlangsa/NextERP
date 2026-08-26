import assert from "node:assert/strict";
import { subsystems } from "./subsystems";
import { augmentAccessiblePages, canLaunchSubsystem, canSeeSubsystem } from "./pageAccess";

const promptSubsystem = subsystems.find(subsystem => subsystem.id === "ai-analysis-prompts");
assert.ok(promptSubsystem, "prompt subsystem must be registered in the production catalog");

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
assert.equal(
  augmentAccessiblePages(new Set(), "ADMIN_VENDOR").has("nexterp.ai_analysis_prompts"),
  true,
);
assert.equal(
  augmentAccessiblePages(new Set(), "MANAGER").has("nexterp.ai_analysis_prompts"),
  false,
);
assert.equal(
  canLaunchSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "OWNER"),
  true,
);
assert.equal(
  canLaunchSubsystem(promptSubsystem, new Set(["nexterp.ai_analysis_prompts"]), "MANAGER"),
  false,
);
