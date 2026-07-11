import { commandResultSchema, type CommandResult, type ProposedAction } from "@/lib/ai/schemas";
import { getAIProvider } from "@/lib/ai/provider";
import { commandPrompt, relaySystemPrompt } from "@/lib/ai/prompts";
import type {
  ActionLogEntry,
  AssistantRequestEntry,
  CalendarEvent,
  CallRequest,
  EmailDraft,
  IntegrationState,
  NotificationItem,
  Note,
  PendingAction,
  Reminder,
  Task,
  UserPreferences,
  UserProfile,
} from "@/lib/types";

type AssistantCommandContext = {
  latestNote?: Note;
  upcomingEvents: CalendarEvent[];
  notifications: NotificationItem[];
  tasks: Task[];
  reminders: Reminder[];
};

export type LocalAssistantPlan = {
  feedMessage: string;
  request: Omit<AssistantRequestEntry, "id" | "happenedAt">;
  event: Omit<ActionLogEntry, "id" | "happenedAt">;
  pendingActions?: PendingAction[];
  drafts?: EmailDraft[];
  calls?: CallRequest[];
};

function baseEvent(title: string, detail: string, category: ActionLogEntry["category"] = "assistant") {
  return { title, detail, category, impact: "info" as const };
}

export function proposalRisk(actionType: ProposedAction["actionType"]): PendingAction["risk"] {
  return actionType === "create_call_plan" ? "high" : "medium";
}

function createPlanFromResult(
  input: string,
  result: CommandResult,
  profile: UserProfile,
  integrations: IntegrationState,
): LocalAssistantPlan {
  if (result.type === "unsupported") {
    return {
      feedMessage: result.message,
      request: { input, outcome: result.message, status: "needs_clarification" },
      event: baseEvent("Assistant request not supported", result.message),
    };
  }

  if (result.type === "clarification") {
    return {
      feedMessage: result.proposal.question,
      request: { input, outcome: result.proposal.question, status: "needs_clarification" },
      event: baseEvent("Assistant requested clarification", result.proposal.missingFields.join(", ")),
    };
  }

  const proposal = result.proposal;
  const pendingActionId = crypto.randomUUID();
  const pendingAction = (type: PendingAction["type"], title: string, description: string, payload: Record<string, unknown>): PendingAction => ({
    id: pendingActionId,
    type,
    title,
    description,
    risk: proposalRisk(proposal.actionType),
    status: "pending",
    payload,
  });

  switch (proposal.actionType) {
    case "create_task": {
      const payload = proposal.payload;
      return {
        feedMessage: proposal.reasoningSummary ?? `Prepared a task proposal for "${payload.title}". It is waiting in Confirmations.`,
        request: { input, outcome: "Created a task proposal for review.", status: "proposal_created" },
        event: baseEvent("Task proposal created", payload.title),
        pendingActions: [pendingAction("create_task", proposal.title, proposal.description, {
          title: payload.title,
          description: payload.description ?? "",
          priority: payload.priority,
          due: payload.dueDate ?? "TBD",
          checklist: payload.checklist,
        })],
      };
    }
    case "create_reminder": {
      const payload = proposal.payload;
      return {
        feedMessage: proposal.reasoningSummary ?? `Prepared a reminder proposal for "${payload.title}". It is waiting in Confirmations.`,
        request: { input, outcome: "Created a reminder proposal for review.", status: "proposal_created" },
        event: baseEvent("Reminder proposal created", `${payload.title} • ${payload.remindAt}`),
        pendingActions: [pendingAction("create_reminder", payload.title, proposal.description, {
          title: payload.title,
          description: payload.description ?? "",
          when: payload.remindAt,
          repeat: payload.repeatRule,
          priority: payload.priority,
        })],
      };
    }
    case "create_tasks_from_note": {
      const payload = proposal.payload;
      return {
        feedMessage: proposal.reasoningSummary ?? `Extracted ${payload.tasks.length} task proposals from ${payload.noteTitle}. They are waiting in Confirmations.`,
        request: { input, outcome: "Created task proposals from the latest note for review.", status: "proposal_created" },
        event: baseEvent("Tasks extracted from note", payload.noteTitle),
        pendingActions: [pendingAction("create_tasks_from_note", proposal.title, proposal.description, { tasks: payload.tasks })],
      };
    }
    case "draft_email": {
      if (!integrations.emailDrafts) {
        return { feedMessage: "Email drafts are disabled in Settings.", request: { input, outcome: "Email drafts are disabled.", status: "needs_clarification" }, event: baseEvent("Email draft blocked", "Email drafts are disabled", "system") };
      }
      const payload = proposal.payload;
      const draftId = crypto.randomUUID();
      return {
        feedMessage: proposal.reasoningSummary ?? "Prepared an email draft for review. It will not be sent automatically.",
        request: { input, outcome: "Created an email draft proposal for review.", status: "proposal_created" },
        event: baseEvent("Email draft prepared", payload.subject),
        drafts: [{ id: draftId, recipient: payload.recipient ?? "", subject: payload.subject, body: payload.body, tone: payload.tone, status: "draft" }],
        pendingActions: [pendingAction("draft_email", `Email draft: ${payload.subject}`, proposal.description, { draftId })],
      };
    }
    case "create_call_plan": {
      if (!integrations.callAssistant) {
        return { feedMessage: "Call Assistant is disabled in Settings.", request: { input, outcome: "Call Assistant is disabled.", status: "needs_clarification" }, event: baseEvent("Call plan blocked", "Call Assistant is disabled", "system") };
      }
      const payload = proposal.payload;
      const callId = crypto.randomUUID();
      const call: CallRequest = {
        id: callId,
        contactName: payload.contactName,
        phoneNumber: payload.phoneNumber ?? "",
        purpose: payload.purpose,
        script: payload.script,
        allowedActions: payload.allowedActions,
        restrictedActions: payload.restrictedActions,
        status: "pending",
      };
      return {
        feedMessage: proposal.reasoningSummary ?? "Prepared a transparent simulated call plan. It is waiting for approval.",
        request: { input, outcome: "Prepared a call plan with approval requirements.", status: "proposal_created" },
        event: { ...baseEvent("Call plan prepared", `${payload.contactName} • ${payload.purpose}`, "call"), impact: "warning" },
        calls: [call],
        pendingActions: [pendingAction("place_call", `Call ${payload.contactName}`, proposal.description, { callId })],
      };
    }
    case "create_calendar_event": {
      if (!integrations.calendar) {
        return { feedMessage: "Calendar planning is disabled in Settings.", request: { input, outcome: "Calendar planning is disabled.", status: "needs_clarification" }, event: baseEvent("Calendar proposal blocked", "Calendar planning is disabled", "system") };
      }
      const payload = proposal.payload;
      return {
        feedMessage: proposal.reasoningSummary ?? `Prepared a calendar proposal for "${payload.title}". It is waiting in Confirmations.`,
        request: { input, outcome: "Created a calendar proposal for review.", status: "proposal_created" },
        event: baseEvent("Calendar proposal created", `${payload.title} • ${payload.start}`),
        pendingActions: [pendingAction("create_calendar_event", payload.title, proposal.description, payload)],
      };
    }
  }
}

export async function classifyCommand(input: {
  userMessage: string;
  currentDate: string;
  timezone: string;
  userContext?: AssistantCommandContext & { profile: UserProfile; preferences: UserPreferences };
  integrations?: IntegrationState;
}): Promise<LocalAssistantPlan> {
  const provider = getAIProvider();
  const result = await provider.generateStructured<CommandResult>({
    systemPrompt: relaySystemPrompt,
    userPrompt: commandPrompt({
      userMessage: input.userMessage,
      currentDate: input.currentDate,
      timezone: input.timezone,
      userContext: input.userContext ?? {},
    }),
    schema: commandResultSchema,
    parse: (value) => commandResultSchema.parse(value),
  });

  return createPlanFromResult(input.userMessage, result, input.userContext?.profile ?? { name: "Rami", email: "", role: "Student" }, input.integrations ?? { calendar: true, emailDrafts: true, callAssistant: true, shareContextWithAi: true });
}
