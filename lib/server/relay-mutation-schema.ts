import { z } from "zod";

const id = z.string().trim().min(1).max(100);
const shortText = z.string().trim().min(1).max(300);
const optionalText = z.string().max(5_000).optional();
const priority = z.enum(["low", "medium", "high"]);
const taskStatus = z.enum(["pending", "done", "overdue"]);

export const relayMutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reset_state") }).strict(),
  z.object({ type: z.literal("submit_command"), input: z.string().trim().min(1).max(2_000) }).strict(),
  z.object({ type: z.literal("approve_action"), actionId: id }).strict(),
  z.object({ type: z.literal("cancel_action"), actionId: id }).strict(),
  z.object({ type: z.literal("update_pending_action"), actionId: id, updates: z.object({
    title: z.string().max(300).optional(),
    description: z.string().max(2_000).optional(),
    risk: z.enum(["low", "medium", "high"]).optional(),
    status: z.enum(["pending", "approved", "cancelled"]).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }).strict() }).strict(),
  z.object({ type: z.literal("add_task"), input: z.object({ title: shortText, due: shortText, priority, description: optionalText }).strict() }).strict(),
  z.object({ type: z.literal("toggle_task"), taskId: id }).strict(),
  z.object({ type: z.literal("update_task"), taskId: id, updates: z.object({ title: z.string().max(300).optional(), description: z.string().max(5_000).optional(), due: z.string().max(300).optional(), status: taskStatus.optional(), priority: priority.optional() }).strict() }).strict(),
  z.object({ type: z.literal("delete_task"), taskId: id }).strict(),
  z.object({ type: z.literal("add_note"), input: z.object({ title: shortText, content: z.string().trim().min(1).max(50_000) }).strict() }).strict(),
  z.object({ type: z.literal("delete_note"), noteId: id }).strict(),
  z.object({ type: z.literal("update_note"), noteId: id, updates: z.object({ title: z.string().max(300).optional(), content: z.string().max(50_000).optional(), summary: z.string().max(5_000).optional(), tags: z.array(z.string().trim().min(1).max(50)).max(20).optional() }).strict() }).strict(),
  z.object({ type: z.literal("summarize_note"), noteId: id }).strict(),
  z.object({ type: z.literal("suggest_note_tags"), noteId: id }).strict(),
  z.object({ type: z.literal("add_reminder"), input: z.object({ title: shortText, when: shortText, repeat: z.enum(["none", "daily", "weekly", "monthly"]), priority }).strict() }).strict(),
  z.object({ type: z.literal("update_reminder"), reminderId: id, updates: z.object({ title: z.string().max(300).optional(), when: z.string().max(300).optional(), repeat: z.enum(["none", "daily", "weekly", "monthly"]).optional(), priority: priority.optional(), status: z.enum(["active", "snoozed", "done"]).optional() }).strict() }).strict(),
  z.object({ type: z.literal("delete_reminder"), reminderId: id }).strict(),
  z.object({ type: z.literal("add_calendar_event"), input: z.object({ title: shortText, detail: z.string().max(5_000), start: shortText, end: shortText, location: z.string().max(300).optional(), tone: z.enum(["teal", "gold", "rose"]) }).strict() }).strict(),
  z.object({ type: z.literal("update_calendar_event"), eventId: id, updates: z.object({ title: z.string().max(300).optional(), detail: z.string().max(5_000).optional(), start: z.string().max(300).optional(), end: z.string().max(300).optional(), location: z.string().max(300).optional(), tone: z.enum(["teal", "gold", "rose"]).optional() }).strict() }).strict(),
  z.object({ type: z.literal("delete_calendar_event"), eventId: id }).strict(),
  z.object({ type: z.literal("retry_calendar_sync"), eventId: id }).strict(),
  z.object({ type: z.literal("mark_notification_read"), notificationId: id }).strict(),
  z.object({ type: z.literal("update_notification_category"), notificationId: id, category: z.enum(["urgent", "important", "later", "low"]) }).strict(),
  z.object({ type: z.literal("save_draft"), draftId: id, updates: z.object({ recipient: z.string().max(254).optional(), subject: z.string().max(500).optional(), body: z.string().max(50_000).optional(), tone: z.enum(["professional", "friendly", "short", "formal"]).optional(), status: z.enum(["draft", "approved"]).optional() }).strict() }).strict(),
  z.object({ type: z.literal("delete_draft"), draftId: id }).strict(),
  z.object({ type: z.literal("add_workout"), input: z.object({ activity: shortText, durationMinutes: z.number().int().min(1).max(1_440), caloriesBurned: z.number().int().min(0).max(10_000).optional(), intensity: z.enum(["low", "moderate", "high"]), notes: z.string().max(5_000).optional(), performedAt: z.string().datetime() }).strict() }).strict(),
  z.object({ type: z.literal("delete_workout"), workoutId: id }).strict(),
  z.object({ type: z.literal("add_meal"), input: z.object({ name: shortText, mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]), calories: z.number().int().min(1).max(20_000), protein: z.number().min(0).max(2_000).optional(), carbs: z.number().min(0).max(2_000).optional(), fat: z.number().min(0).max(2_000).optional(), eatenAt: z.string().datetime() }).strict() }).strict(),
  z.object({ type: z.literal("delete_meal"), mealId: id }).strict(),
  z.object({ type: z.literal("update_preferences"), updates: z.object({ theme: z.enum(["carbon", "light", "dawn", "ocean"]).optional(), assistantTone: z.enum(["calm", "friendly", "formal"]).optional(), digestStyle: z.enum(["balanced", "brief"]).optional(), approvalsLocked: z.boolean().optional() }).strict() }).strict(),
  z.object({ type: z.literal("update_profile"), updates: z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().trim().email().max(254).optional(), role: z.string().trim().min(2).max(80).optional() }).strict() }).strict(),
  z.object({ type: z.literal("update_integrations"), updates: z.object({ calendar: z.boolean().optional(), emailDrafts: z.boolean().optional(), shareContextWithAi: z.boolean().optional() }).strict() }).strict(),
]);
