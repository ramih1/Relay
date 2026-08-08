import assert from "node:assert/strict";
import test from "node:test";

import { proposalRisk } from "../lib/ai/classify-command";
import { proposedActionSchema } from "../lib/ai/schemas";

test("Relay assigns risk deterministically instead of trusting model output", () => {
  assert.equal(proposalRisk("create_task"), "medium");
  assert.equal(proposalRisk("create_reminder"), "medium");
  assert.equal(proposalRisk("draft_email"), "medium");
  assert.equal(proposalRisk("create_calendar_event"), "medium");
  assert.equal(proposalRisk("create_tasks_from_note"), "medium");
});

test("task extraction proposals accept a reviewable list of note actions", () => {
  const result = proposedActionSchema.safeParse({
    actionType: "create_tasks_from_note",
    title: "Tasks extracted from note",
    description: "Review the action items before creating tasks.",
    riskLevel: "medium",
    requiresConfirmation: true,
    payload: {
      noteTitle: "Relay audit notes",
      tasks: ["Send the project update", "Schedule the demo"],
    },
  });

  assert.equal(result.success, true);
});

test("data-changing proposals cannot disable confirmation", () => {
  const result = proposedActionSchema.safeParse({
    actionType: "create_reminder",
    title: "Submit report",
    description: "",
    riskLevel: "low",
    requiresConfirmation: false,
    payload: {
      title: "Submit report",
      remindAt: "2026-07-12T17:00:00-04:00",
      repeatRule: "none",
      priority: "medium",
    },
  });

  assert.equal(result.success, false);
});
