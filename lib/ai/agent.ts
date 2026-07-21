import type {
  ActionLogEntry,
  AssistantRequestEntry,
  CalendarEvent,
  EmailDraft,
  NotificationItem,
  Note,
  PendingAction,
  Reminder,
  Task,
  IntegrationState,
  UserPreferences,
  UserProfile,
} from "@/lib/types";

type AssistantCommandPlan = {
  feedMessage: string;
  request: Omit<AssistantRequestEntry, "id" | "happenedAt">;
  event: Omit<ActionLogEntry, "id" | "happenedAt">;
  pendingActions?: PendingAction[];
  drafts?: EmailDraft[];
};

type AssistantCommandContext = {
  latestNote?: Note;
  upcomingEvents: CalendarEvent[];
  notifications: NotificationItem[];
  tasks: Task[];
  reminders: Reminder[];
};

const defaultPreferences: UserPreferences = {
  theme: "carbon",
  assistantTone: "calm",
  digestStyle: "balanced",
  approvalsLocked: true,
};

const defaultProfile: UserProfile = {
  name: "Rami",
  email: "rami@example.com",
  role: "Student",
};

const defaultIntegrations: IntegrationState = {
  calendar: true,
  emailDrafts: true,
  shareContextWithAi: true,
};

const defaultContext: AssistantCommandContext = {
  latestNote: undefined,
  upcomingEvents: [],
  notifications: [],
  tasks: [],
  reminders: [],
};

function cleanText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function titleCase(input: string) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sentenceCase(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function withTone(message: string, tone: UserPreferences["assistantTone"]) {
  if (tone === "friendly") {
    return `${message} I kept it ready for you to review when you want.`;
  }

  if (tone === "formal") {
    return `${message} It is prepared for your review and approval.`;
  }

  return message;
}

function extractTimePhrase(input: string) {
  const match = input.match(
    /\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+[\d:apm\s]+)?/i,
  );

  if (match) {
    return sentenceCase(match[0].replace(/\s+/g, " "));
  }

  const atMatch = input.match(/\bat\s+([\d:]+(?:\s?[ap]m)?)/i);
  if (atMatch) {
    return `Today at ${atMatch[1].replace(/\s+/g, " ").trim()}`;
  }

  return "Tomorrow at 9:00 AM";
}

function inferPriority(input: string): Task["priority"] | Reminder["priority"] {
  if (/(exam|assignment|project|deadline|urgent|professor|interview)/i.test(input)) {
    return "high";
  }

  if (/(meeting|email|team|gym|class)/i.test(input)) {
    return "medium";
  }

  return "low";
}

function buildNoteSummaryPlan(
  rawInput: string,
  preferences: UserPreferences,
  context: AssistantCommandContext,
): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const note = context.latestNote;

  if (!note) {
    return buildClarificationPlan("There are no notes to summarize yet. Add one first, then ask again.", preferences);
  }

  const summary = note.summary || note.content.slice(0, 180);

  return {
    feedMessage: withTone(`Summary for "${note.title}": ${summary}`, preferences.assistantTone),
    request: {
      input,
      outcome: `Summarized the latest note: ${note.title}.`,
      status: "completed",
    },
    event: {
      title: "Note summary generated",
      detail: note.title,
      category: "assistant",
      impact: "info",
    },
  };
}

function buildNotificationSummaryPlan(
  rawInput: string,
  preferences: UserPreferences,
  context: AssistantCommandContext,
): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const urgent = context.notifications.filter((item) => item.category === "urgent");
  const important = context.notifications.filter((item) => item.category === "important");
  const top = [...context.notifications]
    .sort((left, right) => {
      const rank: Record<NotificationItem["category"], number> = {
        urgent: 0,
        important: 1,
        later: 2,
        low: 3,
      };

      return rank[left.category] - rank[right.category];
    })
    .slice(0, 2)
    .map((item) => item.title);

  const summary =
    urgent.length > 0
      ? `${urgent.length} urgent and ${important.length} important notifications need attention. Top items: ${top.join(", ")}.`
      : important.length > 0
        ? `${important.length} important notifications are worth checking next. Top items: ${top.join(", ")}.`
        : "No urgent notifications right now. You can handle the rest later.";

  return {
    feedMessage: withTone(summary, preferences.assistantTone),
    request: {
      input,
      outcome: "Summarized current notifications.",
      status: "completed",
    },
    event: {
      title: "Notification summary generated",
      detail: top.join(", ") || "No urgent notifications",
      category: "assistant",
      impact: "info",
    },
  };
}

function buildDayPlanPlan(
  rawInput: string,
  preferences: UserPreferences,
  context: AssistantCommandContext,
): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const nextEvents = context.upcomingEvents.slice(0, 2);
  const topTask = context.tasks.find((task) => task.status !== "done");
  const nextReminder = context.reminders.find((reminder) => reminder.status === "active");

  const steps = [
    nextEvents[0] ? `Anchor around ${nextEvents[0].title} at ${nextEvents[0].start}` : null,
    topTask ? `Use your first focus block for ${topTask.title}` : null,
    nextEvents[1] ? `Protect time before ${nextEvents[1].title}` : null,
    nextReminder ? `Keep ${nextReminder.title} in mind for ${nextReminder.when}` : null,
  ].filter(Boolean) as string[];

  const plan =
    steps.length > 0
      ? `Day plan: ${steps.join(". ")}.`
      : "Day plan: your schedule looks open, so start with one high-priority task and then queue the next reminder or draft.";

  return {
    feedMessage: withTone(plan, preferences.assistantTone),
    request: {
      input,
      outcome: "Generated a lightweight day plan from your current workspace.",
      status: "completed",
    },
    event: {
      title: "Day plan generated",
      detail: steps[0] ?? "Open schedule",
      category: "assistant",
      impact: "info",
    },
  };
}

function buildTaskPlan(rawInput: string, preferences: UserPreferences): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const title = sentenceCase(
    input
      .replace(/^(add|create|make)\s+(a\s+)?task\s+to\s+/i, "")
      .replace(/^task\s*:\s*/i, "")
      .replace(/\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*$/i, "")
      .trim() || "Follow up task",
  );
  const due = extractTimePhrase(input);
  const priority = inferPriority(input) as Task["priority"];

  return {
    feedMessage: withTone(`Prepared a task proposal for "${title}". It is waiting in Confirmations.`, preferences.assistantTone),
    request: {
      input,
      outcome: `Created a task proposal due ${due}.`,
      status: "proposal_created",
    },
    event: {
      title: "Task proposal created",
      detail: `${title} • ${due}`,
      category: "assistant",
      impact: "info",
    },
    pendingActions: [
      {
        id: crypto.randomUUID(),
        type: "create_task",
        title: "Create Task",
        description: `${title} • ${due}`,
        risk: "medium",
        status: "pending",
        payload: { title, due, priority, description: "" },
      },
    ],
  };
}

function buildCalendarPlan(rawInput: string, preferences: UserPreferences): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const title = sentenceCase(
    input
      .replace(/^(schedule|create|add)\s+(an?\s+)?(event|meeting|calendar event)\s*/i, "")
      .replace(/^for\s+/i, "")
      .replace(/\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*$/i, "")
      .trim() || "New event",
  );
  const start = extractTimePhrase(input);
  const end = start.includes(" at ") ? start.replace(/ at /i, " until ") : "Later";

  return {
    feedMessage: withTone(`Prepared a calendar proposal for "${title}". It is waiting in Confirmations.`, preferences.assistantTone),
    request: {
      input,
      outcome: `Created a calendar proposal for ${start}.`,
      status: "proposal_created",
    },
    event: {
      title: "Calendar proposal created",
      detail: `${title} • ${start}`,
      category: "assistant",
      impact: "info",
    },
    pendingActions: [
      {
        id: crypto.randomUUID(),
        type: "create_calendar_event",
        title: "Create Calendar Event",
        description: `${title} • ${start}`,
        risk: "medium",
        status: "pending",
        payload: {
          title,
          detail: "Planned through assistant",
          start,
          end,
          location: "",
          tone: "teal",
        },
      },
    ],
  };
}

function buildReminderPlan(rawInput: string, preferences: UserPreferences): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const normalized = input.replace(/^remind me to\s+/i, "").replace(/^set a reminder to\s+/i, "");
  const timePhrase = extractTimePhrase(input);
  const title = sentenceCase(
    normalized
      .replace(/\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*$/i, "")
      .replace(/\bat\s+[\d:apm\s]+$/i, "")
      .trim() || "Follow up",
  );
  const priority = inferPriority(input);

  const action: PendingAction = {
    id: crypto.randomUUID(),
    type: "create_reminder",
    title: "Create Reminder",
    description: `${title} • ${timePhrase}`,
    risk: "medium",
    status: "pending",
    payload: {
      title,
      when: timePhrase,
      repeat: "none",
      priority,
    },
  };

  return {
    feedMessage: withTone(`Prepared a reminder proposal for "${title}". It is waiting in Confirmations.`, preferences.assistantTone),
    request: {
      input,
      outcome: `Created a reminder proposal for ${timePhrase}.`,
      status: "proposal_created",
    },
    event: {
      title: "Reminder proposal created",
      detail: `${title} • ${timePhrase}`,
      category: "assistant",
      impact: "info",
    },
    pendingActions: [action],
  };
}

function extractRecipient(input: string) {
  const match = input.match(/\bto\s+(.+?)(?:\s+about|\s+asking|\s+for|\s*$)/i);
  if (!match) {
    return "Recipient to be confirmed";
  }

  return titleCase(match[1].replace(/\bmy\b/gi, "").trim()) || "Recipient to be confirmed";
}

function buildExtensionEmail(recipient: string, profile: UserProfile) {
  return {
    subject: "Request for a Short Extension",
    body:
      `Hi ${recipient === "Recipient to be confirmed" ? "" : recipient},\n\n` +
      "I hope you're doing well. I wanted to ask whether a short extension would be possible for my assignment. " +
      "I've been making steady progress and would appreciate a little more time to submit my best work.\n\n" +
      `Thank you for considering it.\n\nBest,\n${profile.name}`,
  };
}

function buildEmailPlan(
  rawInput: string,
  preferences: UserPreferences,
  profile: UserProfile,
): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const recipient = extractRecipient(input);
  const isExtension = /extension|extend/i.test(input);
  const draftId = crypto.randomUUID();
  const email = isExtension
    ? buildExtensionEmail(recipient, profile)
    : {
        subject: "Follow-up",
        body:
          `Hi ${recipient === "Recipient to be confirmed" ? "" : recipient},\n\n` +
          `I wanted to follow up and share a quick note. Let me know if this works for you.\n\nBest,\n${profile.name}`,
      };

  const draft: EmailDraft = {
    id: draftId,
    recipient,
    subject: email.subject,
    body: email.body,
    tone: /formal/i.test(input) ? "formal" : /friendly/i.test(input) ? "friendly" : "professional",
    status: "draft",
  };

  const action: PendingAction = {
    id: crypto.randomUUID(),
    type: "draft_email",
    title: recipient === "Recipient to be confirmed" ? "Email Draft" : `Email Draft to ${recipient}`,
    description: email.subject,
    risk: "medium",
    status: "pending",
    payload: { draftId },
  };

  return {
    feedMessage: withTone("Drafted an email and queued it for approval before saving.", preferences.assistantTone),
    request: {
      input,
      outcome: "Created an email draft proposal for review.",
      status: "proposal_created",
    },
    event: {
      title: "Email draft prepared",
      detail: email.subject,
      category: "assistant",
      impact: "info",
    },
    drafts: [draft],
    pendingActions: [action],
  };
}

function buildTaskExtractionPlan(rawInput: string, preferences: UserPreferences): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const tasks = [
    "Confirm timeline with professor",
    "Clean dataset labels",
    "Send the team the experiment checklist",
  ];

  const action: PendingAction = {
    id: crypto.randomUUID(),
    type: "create_tasks_from_note",
    title: "Create Tasks from Note",
    description: `${tasks.length} action items identified`,
    risk: "low",
    status: "pending",
    payload: { tasks },
  };

  return {
    feedMessage: withTone(
      "Extracted action items from your note and sent them to Confirmations for review.",
      preferences.assistantTone,
    ),
    request: {
      input,
      outcome: "Extracted note tasks and queued them for approval.",
      status: "proposal_created",
    },
    event: {
      title: "Tasks extracted from note",
      detail: `${tasks.length} task suggestions prepared`,
      category: "assistant",
      impact: "info",
    },
    pendingActions: [action],
  };
}

function buildClarificationPlan(rawInput: string, preferences: UserPreferences): AssistantCommandPlan {
  const input = cleanText(rawInput);

  return {
    feedMessage: withTone(
      "I understood the request at a high level and would ask one focused follow-up before creating an action proposal in the real agent flow.",
      preferences.assistantTone,
    ),
    request: {
      input,
      outcome: "Needs one clarifying follow-up before creating a safe proposal.",
      status: "needs_clarification",
    },
    event: {
      title: "Assistant requested clarification",
      detail: input,
      category: "assistant",
      impact: "info",
    },
  };
}

function buildIntegrationBlockedPlan(
  rawInput: string,
  preferences: UserPreferences,
  capability: "email drafts",
): AssistantCommandPlan {
  const input = cleanText(rawInput);

  return {
    feedMessage: withTone(
      `I held that request because ${capability} is currently disabled in Settings.`,
      preferences.assistantTone,
    ),
    request: {
      input,
      outcome: `Blocked by settings because ${capability} is disabled.`,
      status: "needs_clarification",
    },
    event: {
      title: "Assistant capability blocked by settings",
      detail: capability,
      category: "assistant",
      impact: "warning",
    },
  };
}

export function buildAssistantCommandPlan(
  rawInput: string,
  preferences: UserPreferences = defaultPreferences,
  profile: UserProfile = defaultProfile,
  integrations: IntegrationState = defaultIntegrations,
  context: AssistantCommandContext = defaultContext,
): AssistantCommandPlan {
  const input = cleanText(rawInput);
  const lower = input.toLowerCase();

  if (!input) {
    return buildClarificationPlan("Empty command", preferences);
  }

  if (/(remind me|set a reminder)/i.test(lower)) {
    return buildReminderPlan(input, preferences);
  }

  if (/(draft|write).*\bemail\b/i.test(lower)) {
    if (!integrations.emailDrafts) {
      return buildIntegrationBlockedPlan(input, preferences, "email drafts");
    }

    return buildEmailPlan(input, preferences, profile);
  }

  if (/(turn this note into tasks|extract tasks|action items|tasks from note)/i.test(lower)) {
    return buildTaskExtractionPlan(input, preferences);
  }

  if (/(summarize my notes|summarize my note|summarize notes|note summary)/i.test(lower)) {
    return buildNoteSummaryPlan(input, preferences, context);
  }

  if (/(summarize notifications|notification summary|what matters now|summarize alerts)/i.test(lower)) {
    return buildNotificationSummaryPlan(input, preferences, context);
  }

  if (/(plan my day|plan today|organize my day|around my .* meeting)/i.test(lower)) {
    return buildDayPlanPlan(input, preferences, context);
  }

  if (/^(add|create|make)\s+(a\s+)?task\b|^task\s*:/i.test(lower)) {
    return buildTaskPlan(input, preferences);
  }

  if (/^(schedule|create|add)\s+(an?\s+)?(event|meeting|calendar event)\b/i.test(lower)) {
    if (!integrations.calendar) {
      return buildClarificationPlan(
        "Calendar planning is currently disabled in Settings. Turn it back on to prepare calendar actions.",
        preferences,
      );
    }

    return buildCalendarPlan(input, preferences);
  }

  return buildClarificationPlan(input, preferences);
}
