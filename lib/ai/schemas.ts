import { z } from "zod";

const priority = z.enum(["low", "medium", "high"]);
const tone = z.enum(["professional", "friendly", "short", "formal"]);

const base = {
  title: z.string().min(1).max(160),
  description: z.string().max(500).default(""),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresConfirmation: z.literal(true),
  reasoningSummary: z.string().max(280).optional(),
};

export const proposedActionSchema = z.discriminatedUnion("actionType", [
  z.object({ ...base, actionType: z.literal("create_task"), payload: z.object({ title: z.string().min(1), description: z.string().optional(), priority, dueDate: z.string().nullable().optional(), checklist: z.array(z.string()).default([]) }) }),
  z.object({ ...base, actionType: z.literal("create_reminder"), payload: z.object({ title: z.string().min(1), description: z.string().optional(), remindAt: z.string().min(1), repeatRule: z.enum(["none", "daily", "weekly", "monthly"]), priority }) }),
  z.object({ ...base, actionType: z.literal("create_tasks_from_note"), payload: z.object({ noteTitle: z.string().min(1), tasks: z.array(z.string().min(1)).min(1).max(12) }) }),
  z.object({ ...base, actionType: z.literal("draft_email"), payload: z.object({ recipient: z.string().nullable().optional(), subject: z.string().min(1), body: z.string().min(1), tone }) }),
  z.object({ ...base, actionType: z.literal("create_call_plan"), payload: z.object({ contactName: z.string().min(1), phoneNumber: z.string().nullable().optional(), purpose: z.string().min(1), script: z.string().min(1), questions: z.array(z.string()), allowedActions: z.array(z.string()), restrictedActions: z.array(z.string()) }) }),
  z.object({ ...base, actionType: z.literal("create_calendar_event"), payload: z.object({ title: z.string().min(1), detail: z.string().optional(), start: z.string().min(1), end: z.string().min(1), location: z.string().optional(), tone: z.enum(["teal", "gold", "rose"]).default("teal") }) }),
]);

export const clarificationSchema = z.object({ actionType: z.literal("clarification_required"), question: z.string().min(1), missingFields: z.array(z.string()) });

export const commandResultSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("proposal"), proposal: proposedActionSchema }),
  z.object({ type: z.literal("clarification"), proposal: clarificationSchema }),
  z.object({ type: z.literal("unsupported"), message: z.string().min(1) }),
]);

export type CommandResult = z.infer<typeof commandResultSchema>;
export type ProposedAction = z.infer<typeof proposedActionSchema>;
